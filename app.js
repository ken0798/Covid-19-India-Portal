const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());

const port = 3000;
let db;

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
async function runServer() {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(port, () => {
      console.log(`listening on port:${port}`);
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

runServer();

//Login
app.post("/login/", async (req, res) => {
  const { username, password } = req.body;
  const getUserQuery = `SELECT * FROM user WHERE username="${username}"; `;
  const appUser = await db.get(getUserQuery);
  if (!appUser) {
    res.status(400).send("Invalid user");
  } else {
    const isMatch = await bcrypt.compare(password, appUser.password);
    if (!isMatch) {
      res.status(400).send("Invalid password");
    } else {
      const payload = {
        username,
      };
      const jwtToken = jwt.sign(payload, "ASSUME_RICH");
      //   console.log(token);
      res.status(200).send({ jwtToken });
    }
  }
});

//get All States
app.get("/states/", authCredentials, async (req, res) => {
  //   console.log("Im in states");
  const getAllStatesQuery = "select * from state;";
  const statesInfo = await db.all(getAllStatesQuery);
  res.status(200).send(statesInfo);
});

//get Specific State
app.get("/states/:state_id", authCredentials, async (req, res) => {
  const { state_id } = req.params;
  const getStateQuery = `select * from state where state_id=${state_id};`;
  const stateInfo = await db.get(getStateQuery);
  res.status(200).send(stateInfo);
});

//add District Info
app.post("/districts/", async (req, res) => {
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const addDistrictInfoQuery = `
  INSERT INTO district (districtName, stateId, cases, cured, active, deaths )
  VALUES (
      "${districtName}",
      ${stateId},
      ${cases},
      ${cured},
      ${active},
      ${deaths}
      ); `;
  await db.run(addDistrictInfoQuery);
  res.status(200).send("District Successfully Added");
});

//get district info
app.get("/districts/:district_id", authCredentials, async (req, res) => {
  const { district_id } = req.params;
  const getDistrictQuery = `select * from district where district_id=${district_id};`;
  const districtInfo = await db.get(getDistrictQuery);
  res.status(200).send(districtInfo);
});

//delete district info
app.delete("/districts/:district_id", async (req, res) => {
  const { district_id } = req.params;
  console.log(district_id);
  const removeInfoQuery = `DELETE FROM district WHERE district_id=${district_id};`;
  await db.run(removeInfoQuery);
  res.status(200).send("District Removed");
});

//update district info
app.put("/districts/:district_id", async (req, res) => {
  const { district_id } = req.params;
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const updateInfoQuery = `update district set
  district_name="${districtName}",
   state_id=${stateId},
   cases=${cases},
   cured=${cured},
   active=${active},
   deaths=${deaths}
   WHERE district_id = ${district_id};
   `;
  await db.run(updateInfoQuery);
  res.status(200).send("District Details Updated");
});

//MiddleWare
function authCredentials(req, res, next) {
  const authHeader = req.headers["authorization"];
  let token;
  if (authHeader) {
    token = authHeader.split(" ")[1];
  }
  if (token) {
    try {
      const decoder = jwt.verify(token, "ASSUME_RICH");
      req.username = decoder.username;
      next();
    } catch (error) {
      res.status(401).send("Invalid JWT Token");
    }
  }
}
