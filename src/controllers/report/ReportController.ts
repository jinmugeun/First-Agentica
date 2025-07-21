import { Agentica } from "@agentica/core";
import {
  AgenticaRpcService,
  IAgenticaRpcListener,
  IAgenticaRpcService,
} from "@agentica/rpc";
import { WebSocketRoute } from "@nestia/core";
import core from "@nestia/core";
import { Controller, Post, UploadedFile, UseInterceptors, Body } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import OpenAI from "openai";
import { WebSocketAcceptor } from "tgrid";
import typia from "typia";
import { diskStorage } from "multer";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

import { MyConfiguration } from "../../MyConfiguration";
import { MyGlobal } from "../../MyGlobal";
import { IReport } from "../../api/structures/report/IReport";
import { FileParserService } from "../../providers/report/FileParserService";

@Controller("report")
export class ReportController {
  private templates: Map<string, IReport.ITemplate> = new Map();
  private reports: Map<string, IReport> = new Map();

  /**
   * Upload and parse template file
   */
  @core.TypedRoute.Post("template/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: path.join(MyConfiguration.ROOT, "uploads"),
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}-${file.originalname}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedTypes = [".pdf", ".docx"];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(fileExtension)) {
          cb(null, true);
        } else {
          cb(new Error("Only PDF and DOCX files are allowed"), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    })
  )
  public async uploadTemplate(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: IReport.ITemplateUpload
  ): Promise<{ templateId: string; template: IReport.ITemplate }> {
    try {
      if (!file) {
        throw new Error("No file uploaded");
      }

      // Parse the uploaded file
      const template = await FileParserService.parseFile(file.path, file.originalname);
      
      // Generate template ID and store
      const templateId = uuidv4();
      this.templates.set(templateId, template);

      // Clean up uploaded file
      await FileParserService.cleanupFile(file.path);

      return {
        templateId,
        template,
      };
    } catch (error) {
      // Clean up file in case of error
      if (file?.path) {
        await FileParserService.cleanupFile(file.path);
      }
      throw error;
    }
  }

  /**
   * Get all available templates
   */
  @core.TypedRoute.Get("templates")
  public async getTemplates(): Promise<Record<string, IReport.ITemplate>> {
    const result: Record<string, IReport.ITemplate> = {};
    for (const [id, template] of this.templates.entries()) {
      result[id] = template;
    }
    return result;
  }

  /**
   * WebSocket endpoint for report generation
   */
  @WebSocketRoute()
  public async generateReport(
    @WebSocketRoute.Acceptor()
    acceptor: WebSocketAcceptor<
      undefined,
      IAgenticaRpcService<"chatgpt">,
      IAgenticaRpcListener
    >
  ): Promise<void> {
    const self = this;

    const agent: Agentica<"chatgpt"> = new Agentica({
      model: "chatgpt",
      vendor: {
        api: new OpenAI({ apiKey: MyGlobal.env.OPENAI_API_KEY }),
        model: "gpt-4o-mini",
      },
      controllers: [
        {
          name: "Report Generator",
          protocol: "class",
          application: typia.llm.application<ReportGeneratorService, "chatgpt">(),
          execute: new ReportGeneratorService(self.templates, self.reports),
        },
      ],
    });

    const service: AgenticaRpcService<"chatgpt"> = new AgenticaRpcService({
      agent,
      listener: acceptor.getDriver(),
    });

    await acceptor.accept(service);
  }

  /**
   * Get report by ID
   */
  @core.TypedRoute.Get("reports/:id")
  public async getReport(
    @core.TypedParam("id") id: string
  ): Promise<IReport | null> {
    return this.reports.get(id) || null;
  }

  /**
   * Get all reports
   */
  @core.TypedRoute.Get("reports")
  public async getReports(): Promise<IReport[]> {
    return Array.from(this.reports.values());
  }
}

/**
 * Report Generator Service for AI Agent
 */
class ReportGeneratorService {
  constructor(
    private templates: Map<string, IReport.ITemplate>,
    private reports: Map<string, IReport>
  ) {}

  /**
   * Generate report based on template and user prompt
   */
  public async generateReport(request: {
    templateId: string;
    title: string;
    prompt: string;
    context?: Record<string, any>;
  }): Promise<IReport.IGenerateResponse> {
    try {
      const template = this.templates.get(request.templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      const reportId = uuidv4();
      const report: IReport = {
        id: reportId,
        title: request.title,
        template,
        content: "",
        status: "processing",
        created_at: new Date().toISOString(),
      };

      this.reports.set(reportId, report);

      // Generate content based on template structure
      const generatedContent = await this.generateContentForTemplate(
        template,
        request.prompt,
        request.context
      );

      // Update report with generated content
      report.content = generatedContent;
      report.status = "completed";
      report.completed_at = new Date().toISOString();

      this.reports.set(reportId, report);

      return {
        reportId,
        status: "completed",
        content: generatedContent,
      };
    } catch (error) {
      return {
        reportId: "",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate content for each section of the template
   */
  private async generateContentForTemplate(
    template: IReport.ITemplate,
    userPrompt: string,
    context?: Record<string, any>
  ): Promise<string> {
    let fullContent = `# ${template.filename}에 기반한 보고서\n\n`;

    const systemPrompt = `당신은 전문적인 비즈니스 보고서 작성자입니다. 
주어진 템플릿 구조에 맞춰 사용자의 요청에 따라 보고서를 작성해주세요.

템플릿 구조:
${template.sections.map(section => `- ${section.title}: ${section.placeholder}`).join('\n')}

원본 템플릿 내용:
${template.content}

작성 지침:
1. 각 섹션별로 상세하고 전문적인 내용을 작성하세요
2. 비즈니스 문서에 적합한 격식 있는 언어를 사용하세요
3. 구체적인 데이터나 예시를 포함하세요
4. 마크다운 형식으로 작성하세요
5. 각 섹션은 명확하게 구분되어야 합니다

사용자 요청: ${userPrompt}
${context ? `추가 컨텍스트: ${JSON.stringify(context, null, 2)}` : ''}

위 정보를 바탕으로 템플릿 구조에 맞는 완성된 보고서를 작성해주세요.`;

    // In a real implementation, you would call OpenAI API here
    // For now, we'll generate a structured response based on template sections
    for (const section of template.sections.sort((a, b) => a.order - b.order)) {
      fullContent += `## ${section.title}\n\n`;
      
      if (section.type === "header") {
        fullContent += `### ${section.title} 상세\n\n`;
      }
      
      fullContent += `${section.placeholder}\n\n`;
      
      // Add sample content based on section type
      switch (section.type) {
        case "content":
          fullContent += `[${userPrompt}와 관련된 ${section.title} 내용이 여기에 작성됩니다.]\n\n`;
          break;
        case "table":
          fullContent += `| 항목 | 내용 | 비고 |\n|------|------|------|\n| 예시1 | 데이터1 | 설명1 |\n| 예시2 | 데이터2 | 설명2 |\n\n`;
          break;
        case "list":
          fullContent += `- 첫 번째 항목\n- 두 번째 항목\n- 세 번째 항목\n\n`;
          break;
      }
    }

    fullContent += `\n---\n**보고서 생성 완료**: ${new Date().toLocaleString()}\n`;
    fullContent += `**기반 템플릿**: ${template.filename}\n`;

    return fullContent;
  }

  /**
   * List available templates
   */
  public async listTemplates(): Promise<{ templateId: string; filename: string; sections: number }[]> {
    return Array.from(this.templates.entries()).map(([id, template]) => ({
      templateId: id,
      filename: template.filename,
      sections: template.sections.length,
    }));
  }
}