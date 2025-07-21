import { Module } from "@nestjs/common";
import { ReportController } from "./ReportController";

@Module({
  controllers: [ReportController],
})
export class ReportModule {}