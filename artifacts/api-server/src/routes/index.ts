import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cropRouter from "./crop";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cropRouter);

export default router;
