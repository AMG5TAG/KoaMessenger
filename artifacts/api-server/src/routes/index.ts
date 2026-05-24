import { Router, type IRouter } from "express";
import healthRouter from "./health";
import platformsRouter from "./platforms";
import userPlatformsRouter from "./userPlatforms";
import usersRouter from "./users";
import feedbackRouter from "./feedback";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(platformsRouter);
router.use(userPlatformsRouter);
router.use(usersRouter);
router.use(feedbackRouter);
router.use(notificationsRouter);

export default router;
