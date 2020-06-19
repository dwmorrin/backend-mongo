import { Request, Response } from "express";
import pool, { error500, inflate } from "../../utils/db";
import { controllers } from "../../utils/crud";

const query = "SELECT tag.id,tag.tags as name,json_object('id',`category`.`id`,'name',`category`.`category`,'path',`category`.`sub_category`) as category from tag Left join category on tag.category=category.id";

export const getAll = (req: Request, res: Response) => {
    pool.query(query, (err, rows) => {
      if (err) return res.status(500).json(error500(err));
      res
        .status(200)
        .json({ data: rows.map(inflate), context: req.query.context });
    });
  };

export const getByCategory = (req: Request, res: Response) => {
  pool.query(query + "WHERE category.category = ?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json(error500(err));
    res
      .status(200)
      .json({ data: inflate(rows[0]), context: req.query.context });
  });
};

export const getBySubCategory = (req: Request, res: Response) => {
  pool.query(query + "WHERE category.sub_category = ?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json(error500(err));
    res
      .status(200)
      .json({ data: inflate(rows[0]), context: req.query.context });
  });
};

export default {...controllers("tags", "id"), getAll, getByCategory, getBySubCategory};
