/**
 * Re-export fino para scripts CLI (tsx crawlers/pipeline.ts)
 */
export {
  runCrawlerPipeline,
  runAllMockCrawlers,
  processRawRow,
  findDuplicateProvider,
} from "../src/lib/crawler-pipeline";
