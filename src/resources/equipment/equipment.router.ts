import { Router } from "express";
import controller from "./equipment.controller";
import categories from "./category.controller";
import tags from "./tag.controller";

const router = Router();

// categories & tags
router.get("/categories", categories.getMany);
router.get("/tags", tags.getMany);

router.delete("/:id", controller.removeOne);
router.get("/", controller.getMany);
router.get("/:id", controller.getOne);
router.post("/", controller.createOne);
router.put("/:id", controller.updateOne);

export default router;
