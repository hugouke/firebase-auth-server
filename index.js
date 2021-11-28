const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const express = require("express");
const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "http://localhost:5000",
});

const checkLogin = async (req, res) => {
  const sessionCookie = req.cookies.session || "";

  return admin
    .auth()
    .verifySessionCookie(sessionCookie, true)
    .then((userData) => {
      console.log("Logged in:", userData.email);
      user = userData;
      return user;
    })
    .catch((error) => {
      if (res) res.redirect("/login");
    });
};

const PORT = process.env.PORT || 3000;
const app = express();

app.engine("html", require("ejs").renderFile);
app.use(express.static("static"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/login", function (req, res) {
  res.render("login.html");
});

app.get("/signup", function (req, res) {
  res.render("signup.html");
});

app.get("/profile", async (req, res) => {
  if (await checkLogin(req, res)) {
    res.render("profile.html");
  }
});

app.get("/", function (req, res) {
  res.render("index.html");
});

app.post("/sessionLogin", (req, res) => {
  const idToken = req.body.idToken.toString();
  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  admin
    .auth()
    .createSessionCookie(idToken, { expiresIn })
    .then(
      (sessionCookie) => {
        const options = { maxAge: expiresIn, httpOnly: true };
        res.cookie("session", sessionCookie, options);
        res.end(JSON.stringify({ status: "success" }));
      },
      (error) => {
        res.status(401).send("UNAUTHORIZED REQUEST!");
      }
    );
});

app.get("/sessionLogout", (req, res) => {
  res.clearCookie("session");
  res.redirect("/login");
});

app.post("/addUserInformation", async (req, res) => {
  const db = admin.firestore();
  const UserInformation = db.collection("UserInformation");
  const user = await checkLogin(req, res);
  if (user) await UserInformation.add({ uid: user.uid, ...req.body });
  res.redirect("/profile");
});

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
