import { Router, type IRouter } from "express";
import healthRouter from "./health";
import roadmapsRouter from "./roadmaps";
import industriesRouter from "./industries";
import contentStrategiesRouter from "./contentStrategies";
import seoArticlesRouter from "./seoArticles";

const router: IRouter = Router();

router.use(healthRouter);
router.use(roadmapsRouter);
router.use(industriesRouter);
router.use(contentStrategiesRouter);
router.use(seoArticlesRouter);

export default router;
