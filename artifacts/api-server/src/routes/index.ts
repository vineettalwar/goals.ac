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

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(websiteProjectsRouter);
router.use(roadmapsRouter);
router.use(industriesRouter);
router.use(contentStrategiesRouter);
router.use(seoArticlesRouter);
router.use(geoAuditsRouter);
router.use(contentPiecesRouter);

export default router;
