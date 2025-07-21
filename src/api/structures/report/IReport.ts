import { tags } from "typia";

/**
 * Report structure for template-based document generation
 */
export interface IReport {
  /**
   * Primary Key
   */
  id: string & tags.Format<"uuid">;

  /**
   * Report title
   */
  title: string;

  /**
   * Template file information
   */
  template: IReport.ITemplate;

  /**
   * Generated report content
   */
  content: string;

  /**
   * Report generation status
   */
  status: "pending" | "processing" | "completed" | "failed";

  /**
   * Creation time
   */
  created_at: string & tags.Format<"date-time">;

  /**
   * Completion time
   */
  completed_at?: string & tags.Format<"date-time">;
}

export namespace IReport {
  /**
   * Template file information
   */
  export interface ITemplate {
    /**
     * Original filename
     */
    filename: string;

    /**
     * File type (pdf, docx, etc.)
     */
    type: "pdf" | "docx";

    /**
     * Extracted template content
     */
    content: string;

    /**
     * Template structure/sections
     */
    sections: ITemplateSection[];
  }

  /**
   * Template section structure
   */
  export interface ITemplateSection {
    /**
     * Section title/header
     */
    title: string;

    /**
     * Section content placeholder
     */
    placeholder?: string;

    /**
     * Section order
     */
    order: number;

    /**
     * Section type (header, content, table, etc.)
     */
    type: "header" | "content" | "table" | "list" | "image";
  }

  /**
   * Report generation request
   */
  export interface ICreateRequest {
    /**
     * Report title
     */
    title: string;

    /**
     * Content description/prompt for LLM
     */
    prompt: string;

    /**
     * Template ID to use
     */
    templateId: string;

    /**
     * Additional context or data
     */
    context?: Record<string, any>;
  }

  /**
   * Template upload request
   */
  export interface ITemplateUpload {
    /**
     * Template title
     */
    title: string;

    /**
     * Template description
     */
    description?: string;

    /**
     * Template category
     */
    category?: string;
  }

  /**
   * Report generation response
   */
  export interface IGenerateResponse {
    /**
     * Report ID
     */
    reportId: string;

    /**
     * Generation status
     */
    status: "started" | "completed" | "failed";

    /**
     * Generated content (if completed)
     */
    content?: string;

    /**
     * Error message (if failed)
     */
    error?: string;
  }
}