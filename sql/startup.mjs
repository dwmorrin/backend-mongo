// import the database schema and create the initial admin user

import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createConnection } from "mysql";
import { prompt, schema } from "./startup-prompt.mjs";
import { genSaltSync, hashSync } from "bcrypt";
import { promisify } from "util";
import { exec as _exec } from "child_process";
const exec = promisify(_exec);
import { config } from "dotenv";
import dotenvExpand from "dotenv-expand";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvExpand(config({ path: join(__dirname, "..", ".env") }));
import makeSequencer from "./makeSequencer.mjs";

// get mysql connection info from .env
const {
  MYSQL_USER = "",
  MYSQL_PASSWORD = "",
  MYSQL_DATABASE = "",
  MYSQL_HOST = "",
  NET_ID = "",
  ADMIN_PASSWORD = "",
  ADMIN_FIRST_NAME = "",
  ADMIN_LAST_NAME = "",
  ADMIN_EMAIL = "",
  SEMESTER_TITLE = "",
  SEMESTER_START = "",
  SEMESTER_END = "",
} = process.env;
if (![MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE].every(String)) {
  fatal(".env variables not set");
}

if (
  [
    NET_ID,
    ADMIN_PASSWORD,
    ADMIN_FIRST_NAME,
    ADMIN_LAST_NAME,
    ADMIN_EMAIL,
    SEMESTER_TITLE,
    SEMESTER_START,
    SEMESTER_END,
  ].every(String)
) {
  initializeDatabase(undefined, {
    user: NET_ID,
    password: ADMIN_PASSWORD,
    first: ADMIN_FIRST_NAME,
    last: ADMIN_LAST_NAME,
    email: ADMIN_EMAIL,
    semesterTitle: SEMESTER_TITLE,
    semesterStart: SEMESTER_START,
    semesterEnd: SEMESTER_END,
  });
} else
  try {
    prompt.get(schema, initializeDatabase);
  } catch (error) {
    fatal(error);
  }

/**
 * @param error error from prompt
 * @param responses user's responses from prompt
 * @throws await exec throws errors if exit code not 0
 */
async function initializeDatabase(error, responses) {
  if (error) fatal(error);
  const mysqlCli = `mysql -u${MYSQL_USER} -p${MYSQL_PASSWORD}`;
  // using mysql utility to prepare database for mysqljs lib
  const mysqlCmd = (statement) => `${mysqlCli} -e "${statement}"`;

  /**
   * my.cnf should have the following:
   *   default_authentication_plugin=mysql_native_password
   * if not, then uncomment the lines below if you get the following error:
   * errno 1251 ER_NOT_SUPPORT_AUTH_MODE
   */
  // await exec(
  //   mysqlCmd(
  //     `ALTER USER '${MYSQL_USER}'@'%' IDENTIFIED WITH mysql_native_password by '${MYSQL_PASSWORD}'`
  //   )
  // );

  // convenient to run this command here; could be done with mysqljs lib
  await exec(mysqlCmd(`DROP DATABASE IF EXISTS ${MYSQL_DATABASE}`));
  await exec(mysqlCmd(`CREATE DATABASE ${MYSQL_DATABASE}`));
  await exec(
    `${mysqlCli} ${MYSQL_DATABASE} < "${join(
      __dirname,
      "material_calendar.sql"
    )}"`
  );

  // now we should be able to test/use the mysqljs library
  // and add an new entry to the "user" table
  const connection = createConnection({
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    multipleStatements: true,
  });

  makeSequencer(connection, responses)(
    insertUser,
    insertRoles,
    insertUserRole,
    insertSemester,
    insertActiveSemester,
    insertWalkInProject,
    insertProjectGroup,
    connectUserToGroup,
    end,
    errorHandler
  );
}

function insertUser(connection, state, next) {
  const { user, password, first, last, email } = state;
  connection.query(
    "INSERT INTO user SET ?",
    [
      {
        user_id: user,
        password: encrypt(password),
        first_name: first,
        last_name: last,
        email: email,
      },
    ],
    (err, results) => {
      if (err) return next(err);
      state.userId = results.insertId;
      console.log("user added");
      next();
    }
  );
}

function insertRoles(connection, state, next) {
  connection.query(
    `INSERT INTO role (title) VALUES ('admin');
     INSERT INTO role (title) VALUES ('user');`,
    (err) => {
      if (err) return next(err);
      console.log("roles added");
      next();
    }
  );
}

function insertUserRole(connection, state, next) {
  connection.query(
    "INSERT INTO user_role (user_id, role_id) VALUES (1, 1)",
    (err) => {
      if (err) return next(err);
      console.log("user has admin role");
      next();
    }
  );
}

function insertSemester(connection, state, next) {
  const { semesterTitle, semesterStart, semesterEnd } = state;
  connection.query(
    "INSERT INTO semester SET ?",
    [
      {
        title: semesterTitle,
        start: semesterStart,
        end: semesterEnd,
      },
    ],
    (err, results) => {
      if (err) return next(err);
      state.semesterId = results.insertId;
      console.log("semester added");
      next();
    }
  );
}

function insertActiveSemester(connection, state, next) {
  const { semesterId } = state;
  connection.query(
    "INSERT INTO active_semester SET ?",
    [{ semester_id: semesterId }],
    (err) => {
      if (err) return next(err);
      console.log("active semester added");
      next();
    }
  );
}

function insertWalkInProject(connection, state, next) {
  connection.query(
    "INSERT INTO project SET ?",
    [
      {
        title: "Walk-in",
        group_hours: 999,
        open: 1,
        start: "2000-01-01",
        book_start: "2000-01-01",
        end: "9999-12-31",
        group_size: 1,
      },
    ],
    (err, results) => {
      if (err) return next(err);
      state.walkInProjectId = results.insertId;
      console.log("walk-in project added");
      next();
    }
  );
}

function insertProjectGroup(connection, state, next) {
  const { first, last, walkInProjectId } = state;
  connection.query(
    "INSERT INTO rm_group SET ?",
    [
      {
        name: `${first} ${last}`,
        project_id: walkInProjectId,
        status: 1,
        group_size: 1,
      },
    ],
    (err, results) => {
      if (err) return next(err);
      state.groupId = results.insertId;
      console.log("project group added");
      next();
    }
  );
}

function connectUserToGroup(connection, state, next) {
  const { userId, groupId } = state;
  connection.query(
    "INSERT INTO student_group SET ? ",
    [{ student_id: userId, group_id: groupId }],
    (err) => {
      if (err) return next(err);
      console.log("user added to group");
      next();
    }
  );
}

function end(connection, state, next) {
  connection.end();
  console.log("DONE (dump of state follows)");
  console.log(JSON.stringify(state, null, 2));
}

// just like express, error handler must have arity of 4
function errorHandler(err, connection, state, next) {
  connection.end();
  console.error("Caught an error. Aborting");
  console.error(state);
  fatal(err);
}

function encrypt(plaintext) {
  return hashSync(plaintext, genSaltSync(10));
}

function fatal(error) {
  console.error(error);
  process.exit(1);
}
