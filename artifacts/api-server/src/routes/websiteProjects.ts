import { Router, type IRouter } from "express";
import websiteProjectsCrudRouter from "./websiteProjects-crud";
import websiteProjectsBrandRouter from "./websiteProjects-brand";
import websiteProjectsAutopilotRouter from "./websiteProjects-autopilot";
import websiteProjectsContentRouter from "./websiteProjects-content";

const router: IRouter = Router();

router.use(websiteProjectsCrudRouter);
router.use(websiteProjectsBrandRouter);
router.use(websiteProjectsAutopilotRouter);
router.use(websiteProjectsContentRouter);

export default router;
