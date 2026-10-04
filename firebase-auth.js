import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==================================================
// FIREBASE CONFIG
// ==================================================

const firebaseConfig = {

  apiKey:
    "AIzaSyDvcPINEX7JbBf0qhZNuhxlbMRPx4WypeQ",

  authDomain:
    "alphamind-ai-d6821.firebaseapp.com",

  projectId:
    "alphamind-ai-d6821",

  storageBucket:
    "alphamind-ai-d6821.firebasestorage.app",

  messagingSenderId:
    "850925659846",

  appId:
    "1:850925659846:web:ec7609935dec09f25f99c7"

};


// ==================================================
// INITIALIZE FIREBASE
// ==================================================

const app =
  initializeApp(firebaseConfig);

const auth =
  getAuth(app);

const db =
  getFirestore(app);


// ==================================================
// SIGN UP
// ==================================================

window.signup = function () {

  const fullName =
    document
      .getElementById("fullName")
      .value
      .trim();

  const email =
    document
      .getElementById("email")
      .value
      .trim()
      .toLowerCase();

  const password =
    document
      .getElementById("password")
      .value;

  const confirmPassword =
    document
      .getElementById("confirmPassword")
      .value;


  if (!fullName) {

    alert(
      "Please enter your full name."
    );

    return;
  }


  if (!email) {

    alert(
      "Please enter your email."
    );

    return;
  }


  if (password.length < 6) {

    alert(
      "Password must be at least 6 characters."
    );

    return;
  }


  if (password !== confirmPassword) {

    alert(
      "Passwords do not match."
    );

    return;
  }


  createUserWithEmailAndPassword(
    auth,
    email,
    password
  )

    .then(async (userCredential) => {

      const user =
        userCredential.user;


      // Save Firebase UID
      localStorage.setItem(
        "firebaseUID",
        user.uid
      );


      // Save new user
      await setDoc(
        doc(
          db,
          "users",
          user.uid
        ),
        {

          fullName:
            fullName,

          email:
            user.email,

          plan:
            "Free Trial",

          status:
            "Active",

          joinDate:
            new Date().toISOString()

        }
      );


      alert(
        "Account Created Successfully!"
      );


      window.location.href =
        "dashboard.html";

    })

    .catch(error => {

      console.error(
        "Signup Error:",
        error
      );

      alert(
        error.message
      );

    });

};


// ==================================================
// LOGIN
// ==================================================

window.login = function () {

  const email =
    document
      .getElementById("email")
      .value
      .trim()
      .toLowerCase();

  const password =
    document
      .getElementById("password")
      .value;


  if (!email || !password) {

    alert(
      "Please enter email and password."
    );

    return;
  }


  signInWithEmailAndPassword(
    auth,
    email,
    password
  )

    .then(async (userCredential) => {

      const user =
        userCredential.user;


      // Save UID
      localStorage.setItem(
        "firebaseUID",
        user.uid
      );


      // ==================================================
      // IMPORTANT:
      // LOGIN EXISTING USER
      // Do NOT overwrite existing Firebase plan
      // ==================================================

      const userRef =
        doc(
          db,
          "users",
          user.uid
        );


      const userDoc =
        await getDoc(userRef);


      if (!userDoc.exists()) {

        await setDoc(
          userRef,
          {

            email:
              user.email,

            plan:
              "Free Trial",

            status:
              "Active",

            joinDate:
              new Date().toISOString()

          }
        );

      }


      alert(
        "Login Successful!"
      );


      window.location.href =
        "dashboard.html";

    })

    .catch(error => {

      console.error(
        "Login Error:",
        error
      );

      alert(
        error.message
      );

    });

};


// ==================================================
// LOGOUT
// ==================================================

window.logout = function () {

  signOut(auth)

    .then(() => {

      localStorage.removeItem(
        "firebaseUID"
      );

      localStorage.removeItem(
        "selectedPlan"
      );


      window.location.href =
        "index.html";

    })

    .catch(error => {

      console.error(
        "Logout Error:",
        error
      );

    });

};


// ==================================================
// DASHBOARD SECURITY + USER DATA
// ==================================================

if (
  window.location.pathname.includes(
    "dashboard.html"
  )
) {

  onAuthStateChanged(
    auth,
    async (user) => {

      // ==================================================
      // USER NOT LOGGED IN
      // ==================================================

      if (!user) {

        window.location.href =
          "login.html";

        return;
      }


      // ==================================================
      // SAVE UID
      // ==================================================

      localStorage.setItem(
        "firebaseUID",
        user.uid
      );


      // ==================================================
      // DASHBOARD ELEMENTS
      // ==================================================

      const welcomeUser =
        document.getElementById(
          "welcomeUser"
        );

      const userEmail =
        document.getElementById(
          "userEmail"
        );

      const userPlan =
        document.getElementById(
          "userPlan"
        );

      const userStatus =
        document.getElementById(
          "userStatus"
        );

      const joinDate =
        document.getElementById(
          "joinDate"
        );


      // ==================================================
      // WELCOME
      // ==================================================

      if (welcomeUser) {

        const username =
          user.email
            ? user.email.split("@")[0]
            : "User";

        welcomeUser.textContent =
          `Welcome ${username} 👋`;

      }


      // ==================================================
      // EMAIL
      // ==================================================

      if (userEmail) {

        userEmail.textContent =
          `Email: ${user.email}`;

      }


      // ==================================================
      // GET USER DATA FROM FIRESTORE
      // ==================================================

      try {

        const userRef =
          doc(
            db,
            "users",
            user.uid
          );


        const userDoc =
          await getDoc(userRef);


        if (userDoc.exists()) {

          const userData =
            userDoc.data();


          // ==================================================
          // PLAN
          // ==================================================

          if (userPlan) {

            userPlan.textContent =
              "Plan : " +
              (
                userData.plan ||
                "Free Trial"
              );

          }


          // ==================================================
          // STATUS
          // ==================================================

          if (userStatus) {

            userStatus.textContent =
              "Status : " +
              (
                userData.status ||
                "Active"
              ) +
              " 🟢";

          }


          // ==================================================
          // JOINING DATE
          // ==================================================

          if (joinDate) {

            let dateToShow =
              userData.joinDate ||
              user.metadata.creationTime;


            if (dateToShow) {

              joinDate.textContent =
                "Joining Date : " +
                new Date(
                  dateToShow
                ).toLocaleDateString();

            }

          }

        }

        else {

          // ==================================================
          // FIRESTORE USER DOCUMENT DOES NOT EXIST
          // ==================================================

          await setDoc(
            userRef,
            {

              email:
                user.email,

              plan:
                "Free Trial",

              status:
                "Active",

              joinDate:
                user.metadata.creationTime ||
                new Date().toISOString()

            },
            {
              merge: true
            }
          );


          if (userPlan) {

            userPlan.textContent =
              "Plan : Free Trial";

          }


          if (userStatus) {

            userStatus.textContent =
              "Status : Active 🟢";

          }

        }


      } catch (error) {

        console.error(
          "User Data Error:",
          error
        );

      }

    }
  );

}
