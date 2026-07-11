import { Router, type IRouter } from "express";
import healthRouter from "./health";
import roadmapsRouter from "./roadmaps";
import industriesRouter from "./industries";
import contentStrategiesRouter from "./contentStrategies";
import seoArticlesRouter from "./seoArticles";
import geoAuditsRouter from "./geoAudits";
import authRouter from "./auth";
import websiteProjectsRouter from "./websiteProjects";
import contentPiecesRouter from "./contentPieces";
import chatRouter from "./chat";
import competitorAnalysisRouter from "./competitorAnalysis";
import keywordAnalysisRouter from "./keywordAnalysis";
import goalsRouter from "./goals";
import briefsRouter from "./briefs";
import aiProvidersRouter from "./aiProviders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(aiProvidersRouter);
router.use(websiteProjectsRouter);
router.use(roadmapsRouter);
router.use(industriesRouter);
router.use(contentStrategiesRouter);
router.use(seoArticlesRouter);
router.use(geoAuditsRouter);
router.use(contentPiecesRouter);
router.use(chatRouter);
router.use(competitorAnalysisRouter);
router.use(keywordAnalysisRouter);
router.use(goalsRouter);
router.use(briefsRouter);

export default router;
