import { addResultsToResponse, controllers } from "../../utils/crud";
import pool from "../../utils/db";
import { EC } from "../../utils/types";

const query = `
  SELECT 
    id,
    start,
    end,
    JSON_OBJECT(
      'id', studioId,
      'title', studio,
      'restriction', (
        SELECT studio.restriction FROM studio WHERE studio.id = studioId
       ),
      'allowsWalkIns', (
        SELECT studio.allows_walk_ins FROM studio WHERE studio.id = studioId
      )
    ) AS location,
    description AS title,
    open AS reservable,
    IF (
      reservationId IS NOT NULL,
      JSON_OBJECT(
        'id', reservationId,
        'projectId', projectId,
        'description', purpose,
        'groupId', projectGroupId,
        'liveRoom', \`live room\`,
        'guests', guests,
        'contact', phone,
        'equipment', gear,
        'notes', notes
      ),
      NULL
    ) AS reservation
  FROM
    full_calendar
`;

const getMany: EC = (_, res, next) =>
  pool.query(query, addResultsToResponse(res, next));

const getOne: EC = (req, res, next) =>
  pool.query(
    query + "WHERE id = ?",
    [req.params.id],
    addResultsToResponse(res, next, { one: true })
  );

const createMany: EC = (req, res, next) =>
  pool.query(
    `REPLACE INTO allotment (
      start, end, studio_id, bookable, description
    ) VALUES ?`,
    [
      req.body.map(
        ({
          start = "",
          end = "",
          locationId = 0,
          reservable = false,
          title = "",
        }) => [start, end, locationId, reservable, title]
      ),
    ],
    addResultsToResponse(res, next, { many: true })
  );

const updateOne: EC = (req, res, next) =>
  pool.query(
    `UPDATE allotment SET ? WHERE id = ?`,
    [
      {
        start: req.body.start,
        end: req.body.end,
        studio_id: req.body.locationId,
        bookable: req.body.reservable,
        description: req.body.title,
      },
      req.params.id,
    ],
    addResultsToResponse(res, next)
  );

export default {
  ...controllers("allotment", "id"),
  createMany,
  getMany,
  getOne,
  updateOne,
};
