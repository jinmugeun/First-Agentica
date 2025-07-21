import * as fs from "fs";
import * as path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { IReport } from "../../api/structures/report/IReport";

export class FileParserService {
  /**
   * Parse uploaded file and extract content
   */
  static async parseFile(filePath: string, originalName: string): Promise<IReport.ITemplate> {
    const fileExtension = path.extname(originalName).toLowerCase();
    
    let content: string;
    let type: "pdf" | "docx";

    switch (fileExtension) {
      case ".pdf":
        content = await this.parsePDF(filePath);
        type = "pdf";
        break;
      case ".docx":
        content = await this.parseDOCX(filePath);
        type = "docx";
        break;
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    const sections = this.extractSections(content);

    return {
      filename: originalName,
      type,
      content,
      sections,
    };
  }

  /**
   * Parse PDF file
   */
  private static async parsePDF(filePath: string): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  /**
   * Parse DOCX file
   */
  private static async parseDOCX(filePath: string): Promise<string> {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  /**
   * Extract sections from content
   * This is a simple implementation - can be enhanced with AI for better section detection
   */
  private static extractSections(content: string): IReport.ITemplateSection[] {
    const sections: IReport.ITemplateSection[] = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    let currentSection: IReport.ITemplateSection | null = null;
    let order = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detect headers (lines with specific patterns)
      if (this.isHeader(trimmedLine)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        
        currentSection = {
          title: trimmedLine,
          placeholder: `[${trimmedLine} 내용을 입력하세요]`,
          order: order++,
          type: "header",
        };
      } else if (currentSection && trimmedLine) {
        // Add content to current section
        currentSection.type = "content";
        if (!currentSection.placeholder) {
          currentSection.placeholder = trimmedLine;
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    // If no sections found, create a default structure
    if (sections.length === 0) {
      sections.push({
        title: "전체 문서",
        placeholder: "[보고서 내용을 입력하세요]",
        order: 0,
        type: "content",
      });
    }

    return sections;
  }

  /**
   * Check if line is a header
   */
  private static isHeader(line: string): boolean {
    // Common header patterns
    const headerPatterns = [
      /^\d+\.\s+.+/,           // 1. Header
      /^[가-힣]\.\s+.+/,       // 가. Header
      /^[A-Z]\.\s+.+/,         // A. Header
      /^#{1,6}\s+.+/,          // # Markdown headers
      /^.{1,50}:$/,            // Short line ending with colon
      /^[[\]【】]\s*.+\s*[[\]】]/,  // [Section] or 【Section】
    ];

    return headerPatterns.some(pattern => pattern.test(line)) ||
           (line.length < 100 && line.includes('목표') || line.includes('개요') || 
            line.includes('배경') || line.includes('결론') || line.includes('요약'));
  }

  /**
   * Clean up uploaded file
   */
  static async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error("Failed to cleanup file:", error);
    }
  }
}