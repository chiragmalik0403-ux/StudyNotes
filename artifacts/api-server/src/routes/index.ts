import { Router, type IRouter } from "express";
import healthRouter from "./health";
import notesRouter from "./notes";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(notesRouter);
router.use(usersRouter);

export default router;
