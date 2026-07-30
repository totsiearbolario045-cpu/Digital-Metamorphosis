import { Router, type IRouter } from "express";
import healthRouter from "./health";
import statsRouter from "./stats";
import categoriesRouter from "./categories";
import servicesRouter from "./services";
import cloudComponentsRouter from "./cloud-components";
import agentsRouter from "./agents";
import requestsRouter from "./requests";
import resourcesRouter from "./resources";
import controlPlaneRouter from "./control-plane";

const router: IRouter = Router();

router.use(healthRouter);
router.use(statsRouter);
router.use(categoriesRouter);
router.use(servicesRouter);
router.use(cloudComponentsRouter);
router.use(agentsRouter);
router.use(requestsRouter);
router.use(resourcesRouter);
router.use(controlPlaneRouter);

export default router;
