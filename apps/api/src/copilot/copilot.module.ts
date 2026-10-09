import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DealerModule } from '../dealer/dealer.module';
import { SiteVisitsModule } from '../site-visits/site-visits.module';
import { OpenAiCompatibleProvider, readAiConfig } from './configured-llm.provider';
import { ConfiguredOllamaProvider } from './configured-ollama.provider';
import { PrismaCopilotDataSource } from './copilot-data';
import { CopilotController } from './copilot.controller';
import { CopilotService } from './copilot.service';
import { LLM_PROVIDER, type LlmProvider } from './llm-provider';

@Module({
  imports: [AuthModule, DealerModule, SiteVisitsModule],
  controllers: [CopilotController],
  providers: [
    OpenAiCompatibleProvider,
    ConfiguredOllamaProvider,
    {
      provide: LLM_PROVIDER,
      useFactory: (openai: OpenAiCompatibleProvider, ollama: ConfiguredOllamaProvider): LlmProvider =>
        readAiConfig().provider === 'ollama' ? ollama : openai,
      inject: [OpenAiCompatibleProvider, ConfiguredOllamaProvider],
    },
    PrismaCopilotDataSource,
    CopilotService,
  ],
})
export class CopilotModule {}
