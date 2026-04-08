import { Router, type IRouter } from "express";
import healthRouter from "./health";
import roadmapsRouter from "./roadmaps";
import industriesRouter from "./industries";

const router: IRouter = Router();

router.use(healthRouter);
router.use(roadmapsRouter);
router.use(industriesRouter);

export default router;
