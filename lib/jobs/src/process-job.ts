import type { QueueName } from "./queues";
import { QUEUES } from "./queues";
import { processConnectionHealthCheck } from "./handlers/connectionHealthCheck";
import { processKeywordRankCheck } from "./handlers/keywordRankCheck";
import { processContentGenerate } from "./handlers/contentGenerate";
import { processContentPublish, processScheduledPublishSweep } from "./handlers/contentPublish";
import { processContentGenerateSweep } from "./handlers/contentGenerateSweep";
import { processLlmVisibilityCheck } from "./handlers/llmVisibilityCheck";
import { processGeoReauditSweep } from "./handlers/geoReauditSweep";
import { processKeywordOpportunitySweep } from "./handlers/keywordOpportunitySweep";
import { processContentDecaySweep } from "./handlers/contentDecaySweep";
import { processGscSearchAnalyticsSync } from "./handlers/gscSearchAnalyticsSync";
import { processGa4AnalyticsSync } from "./handlers/ga4AnalyticsSync";
import { processArticleIdeaSourceSync } from "./handlers/articleIdeaSourceSync";
import { processBrandVoiceIndex } from "./handlers/brandVoiceIndex";
import { processBrandVoiceSkillRegen } from "./handlers/brandVoiceSkillRegen";
import { processBrandVoiceResync } from "./handlers/brandVoiceResync";
import { processEvergreenRecycleSweep } from "./handlers/evergreenRecycle";
import { processSocialHistorySync } from "./handlers/socialHistorySync";
import { processSocialMetricsSync } from "./handlers/socialMetricsSync";
import { processPublicGeoAudit } from "./handlers/publicGeoAudit";
import { processSiteAuditCrawl } from "./handlers/siteAuditCrawl";
import { processGscUrlInspection } from "./handlers/gscUrlInspection";
import { processPublishReliabilityAlert } from "./handlers/publishReliabilityAlert";
import type { JobEnvelope } from "./cf-queues";

const processors: Record<QueueName, (payload: unknown) => Promise<void>> = {
  [QUEUES.connectionHealthCheck]: (p) => processConnectionHealthCheck(p as never),
  [QUEUES.keywordRankCheck]: (p) => processKeywordRankCheck(p as never),
  [QUEUES.contentGenerate]: (p) => processContentGenerate(p as never),
  [QUEUES.contentPublish]: (p) => processContentPublish(p as never),
  [QUEUES.contentGenerateSweep]: (p) => processContentGenerateSweep(p as never),
  [QUEUES.scheduledPublishSweep]: () => processScheduledPublishSweep(),
  [QUEUES.llmVisibilityCheck]: (p) => processLlmVisibilityCheck(p as never),
  [QUEUES.geoReauditSweep]: (p) => processGeoReauditSweep(p as never),
  [QUEUES.keywordOpportunitySweep]: (p) => processKeywordOpportunitySweep(p as never),
  [QUEUES.contentDecaySweep]: (p) => processContentDecaySweep(p as never),
  [QUEUES.gscSearchAnalyticsSync]: (p) => processGscSearchAnalyticsSync(p as never),
  [QUEUES.ga4AnalyticsSync]: (p) => processGa4AnalyticsSync(p as never),
  [QUEUES.articleIdeaSourceSync]: (p) => processArticleIdeaSourceSync(p as never),
  [QUEUES.brandVoiceIndex]: (p) => processBrandVoiceIndex(p as never),
  [QUEUES.brandVoiceSkillRegen]: (p) => processBrandVoiceSkillRegen(p as never),
  [QUEUES.brandVoiceResync]: (p) => processBrandVoiceResync(p as never),
  [QUEUES.evergreenRecycleSweep]: () => processEvergreenRecycleSweep(),
  [QUEUES.socialHistorySync]: (p) => processSocialHistorySync(p as never),
  [QUEUES.socialMetricsSync]: (p) => processSocialMetricsSync(p as never),
  [QUEUES.publicGeoAudit]: (p) => processPublicGeoAudit(p as never),
  [QUEUES.siteAuditCrawl]: (p) => processSiteAuditCrawl(p as never),
  [QUEUES.gscUrlInspection]: (p) => processGscUrlInspection(p as never),
  [QUEUES.publishReliabilityAlert]: () => processPublishReliabilityAlert(),
};

export async function processJobEnvelope(envelope: JobEnvelope): Promise<void> {
  const handler = processors[envelope.queue];
  if (!handler) {
    throw new Error(`No job processor registered for queue: ${envelope.queue}`);
  }
  await handler(envelope.payload);
}

export async function processJob(queue: QueueName, payload: unknown): Promise<void> {
  await processJobEnvelope({ queue, payload } as JobEnvelope);
}
