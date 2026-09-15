import { Router, type IRouter } from "express";
import authSessionRouter from "./auth-session";
import authGoogleRouter from "./auth-google";
import authPasswordResetRouter from "./auth-password-reset";

const router: IRouter = Router();

router.use(authSessionRouter);
router.use(authGoogleRouter);
router.use(authPasswordResetRouter);

export default router;
