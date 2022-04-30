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
app.get("/states/:stateId/", authCredentials, async (req, res) => {
  const { stateId } = req.params;
  const getStateQuery = `select * from state where state_id=${stateId};`;
  const stateInfo = await db.get(getStateQuery);
  res.status(200).send(stateInfo);
});

//add District Info
app.post("/districts/", authCredentials, async (req, res) => {
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
app.get("/districts/:districtId/", authCredentials, async (req, res) => {
  const { districtId } = req.params;
  const getDistrictQuery = `select * from district where district_id=${districtId};`;
  const districtInfo = await db.get(getDistrictQuery);
  res.status(200).send(districtInfo);
});

//delete district info
app.delete("/districts/:districtId/", authCredentials, async (req, res) => {
  const { districtId } = req.params;
  //   console.log(districtId);
  const removeInfoQuery = `DELETE FROM district WHERE district_id=${districtId};`;
  await db.run(removeInfoQuery);
  res.status(200).send("District Removed");
});

//update district info
app.put("/districts/:districtId/", authCredentials, async (req, res) => {
  const { districtId } = req.params;
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const updateInfoQuery = `update district set
  district_name="${districtName}",
   state_id=${stateId},
   cases=${cases},
   cured=${cured},
   active=${active},
   deaths=${deaths}
   WHERE district_id = ${districtId};
   `;
  await db.run(updateInfoQuery);
  res.status(200).send("District Details Updated");
});

//get Stats of a state
app.get("/states/:stateId/stats/", authCredentials, async (req, res) => {
  const { stateId } = req.params;
  const getStatsQuery = `select 
    sum(cases) as total_cases,
    sum(cured) as total_cured,
    sum(active) as total_active,
    sum(deaths) as total_deaths
    from district
    where state_id=${stateId}
    group by state_id ;`;
  const dbStats = await db.get(getStatsQuery);
  const obj = {
    totalCases: dbStats.total_cases,
    totalCured: dbStats.total_cured,
    totalActive: dbStats.total_active,
    totalDeaths: dbStats.total_deaths,
  };
  //   console.log(obj);
  res.status(200).send(obj);
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
      res.status(401).send("No Access");
    }
  } else {
    res.status(401).send("Invalid JWT Token");
  }
}

module.exports = app;
