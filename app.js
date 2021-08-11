const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const addDays = require("date-fns/addDays");
const format = require("date-fns/format");
const path = require("path");
const isValid = require("date-fns/isValid");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const queryStatusCheck = (request, response, next) => {
  const { status } = request.query;
  const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
  if (statusArray.includes(status) || status === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Todo Status");
  }
};

const queryPriorityCheck = (request, response, next) => {
  const { priority } = request.query;
  const priorityArray = ["HIGH", "MEDIUM", "LOW"];
  if (priorityArray.includes(priority) || priority === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
};

const queryCategoryCheck = (request, response, next) => {
  const { category } = request.query;
  const categoryArray = ["WORK", "HOME", "LEARNING"];
  if (categoryArray.includes(category) || category === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Todo Category");
  }
};

const queryDueDateCheck = (request, response, next) => {
  let { date } = request.query;
  if (isValid(new Date(date)) || date === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
};

const todoObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    category: dbObject.category,
    priority: dbObject.priority,
    status: dbObject.status,
    dueDate: dbObject.due_date,
  };
};

app.get(
  "/todos/",
  queryStatusCheck,
  queryPriorityCheck,
  queryCategoryCheck,
  queryDueDateCheck,
  async (request, response) => {
    let {
      status = "",
      priority = "",
      category = "",
      date = "",
      search_q = "",
    } = request.query;
    if (date !== "") {
      date = format(new Date(date), "yyyy-MM-dd");
    }
    const getAllTodoQuery = `
      SELECT *
      FROM todo
      WHERE status LIKE "%${status}%"
      AND priority LIKE "%${priority}%"
      AND category LIKE "%${category}%"
      AND due_date LIKE "%${date}%"
      AND todo LIKE "%${search_q}%";`;
    const allTodos = await database.all(getAllTodoQuery);
    response.send(
      allTodos.map((eachObject) => todoObjectToResponseObject(eachObject))
    );
  }
);

//API-2
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  response.send(todoObjectToResponseObject(todo));
});

//API-3
app.get(
  "/agenda/",
  queryStatusCheck,
  queryPriorityCheck,
  queryCategoryCheck,
  queryDueDateCheck,
  async (request, response) => {
    let { date } = request.query;
    if (date !== "") {
      date = format(new Date(date), "yyyy-MM-dd");
    }
    const getQuery = `
   SELECT  
     * 
    FROM 
      todo 
    where  
      due_date LIKE "%${date}%";`;
    const resultDate = await database.all(getQuery);
    response.send(
      resultDate.map((eachObject) => todoObjectToResponseObject(eachObject))
    );
  }
);

const postOrUpdateStatusCheck = (request, response, next) => {
  const { status } = request.body;
  const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
  if (statusArray.includes(status) || status === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Todo Status");
  }
};

const postOrUpdatePriorityCheck = (request, response, next) => {
  const { priority } = request.body;
  const priorityArray = ["HIGH", "MEDIUM", "LOW"];
  if (priorityArray.includes(priority) || priority === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
};

const postOrUpdateCategoryCheck = (request, response, next) => {
  const { category } = request.body;
  const categoryArray = ["WORK", "HOME", "LEARNING"];
  if (categoryArray.includes(category) || category === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Todo Category");
  }
};

const postOrUpdateDueDateCheck = (request, response, next) => {
  let { dueDate } = request.body;
  if (isValid(new Date(dueDate)) || dueDate === undefined) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
};

app.post(
  "/todos/",
  postOrUpdateStatusCheck,
  postOrUpdatePriorityCheck,
  postOrUpdateCategoryCheck,
  postOrUpdateDueDateCheck,
  async (request, response) => {
    let { id, todo, category, priority, status, dueDate } = request.body;
    if (dueDate !== "") {
      dueDate = format(new Date(dueDate), "yyyy-MM-dd");
    }
    const postTodoQuery = `
  INSERT INTO 
   todo(id, todo, category, priority, status, due_date)
   VALUES
   (${id},"${todo}","${category}","${priority}","${status}","${dueDate}");`;
    await database.run(postTodoQuery);
    response.send("Todo Successfully Added");
  }
);

app.put(
  "/todos/:todoId/",
  postOrUpdateStatusCheck,
  postOrUpdatePriorityCheck,
  postOrUpdateCategoryCheck,
  postOrUpdateDueDateCheck,
  async (request, response) => {
    const { todoId } = request.params;
    let updateQuery = "";
    const requestBody = request.body;
    switch (true) {
      case requestBody.todo !== undefined:
        element = "Todo";
        break;
      case requestBody.priority !== undefined:
        element = "Priority";
        break;
      case requestBody.status !== undefined:
        element = "Status";
        break;
      case requestBody.category !== undefined:
        element = "Category";
        break;
      case requestBody.dueDate !== undefined:
        element = "Due Date";
        break;
    }
    const previousTodoQuery = `
  SELECT 
     *
  FROM 
    todo
  WHERE id=${todoId};`;
    const previousTodo = await database.get(previousTodoQuery);

    let {
      todo = previousTodo.todo,
      priority = previousTodo.priority,
      status = previousTodo.status,
      category = previousTodo.category,
      dueDate = previousTodo.due_date,
    } = request.body;
    if (dueDate !== "") {
      dueDate = format(new Date(dueDate), "yyyy-MM-dd");
    }
    const updateTodoQuery = `
    UPDATE todo
    SET
    todo = "${todo}",
    priority = "${priority}",
    status = "${status}",
    category = "${category}",
    due_date = "${dueDate}"
    WHERE id = ${todoId};`;
    await database.run(updateTodoQuery);
    response.send(`${element} Updated`);
  }
);

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM todo WHERE id = ${todoId};`;
  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
