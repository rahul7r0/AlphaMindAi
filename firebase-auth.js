import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyDvcPINEX7JbBf0qhZNuhxlbMRPx4WypeQ",
  authDomain: "alphamind-ai-d6821.firebaseapp.com",
  projectId: "alphamind-ai-d6821",
  storageBucket: "alphamind-ai-d6821.firebasestorage.app",
  messagingSenderId: "850925659846",
  appId: "1:850925659846:web:ec7609935dec09f25f99c7"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// ================================
// SIGN UP
// ================================

window.signup = function () {

  const fullName =
    document.getElementById("fullName").value.trim();

  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;

  const confirmPassword =
    document.getElementById("confirmPassword").value;


  if (!fullName) {
    alert("Please enter your full name.");
    return;
  }


  if (!email) {
    alert("Please enter your email.");
    return;
  }


  if (password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }


  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }


  createUserWithEmailAndPassword(
    auth,
    email,
    password
  )

  .then(async (userCredential) => {

    await setDoc(
      doc(db, "users", userCredential.user.uid),
      {
        fullName: fullName,
        email: userCredential.user.email,
        plan: "Free Trial",
        status: "Active",
        joinDate: new Date().toISOString()
      }
    );


    alert("Account Created Successfully!");

    window.location.href =
      "dashboard.html";

  })

  .catch(error => {

    console.error(
      "Signup Error:",
      error
    );

    alert(error.message);

  });

};


// ================================
// LOGIN
// ================================

window.login = function () {

  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;


  if (!email || !password) {

    alert(
      "Please enter email and password."
    );

    return;
  }


  const params =
    new URLSearchParams(
      window.location.search
    );


  const selectedPlan =
    params.get("plan") ||
    localStorage.getItem("selectedPlan") ||
    "Free Trial";


  signInWithEmailAndPassword(
    auth,
    email,
    password
  )

  .then(async (userCredential) => {

    const user =
      userCredential.user;


    await setDoc(
      doc(db, "users", user.uid),
      {
        plan: selectedPlan,
        status: "Active"
      },
      {
        merge: true
      }
    );


    localStorage.removeItem(
      "selectedPlan"
    );


    alert("Login Successful!");


    window.location.href =
      "dashboard.html";

  })

  .catch(error => {

    console.error(
      "Login Error:",
      error
    );

    alert(error.message);

  });

};


// ================================
// LOGOUT
// ================================

window.logout = function () {

  signOut(auth)

    .then(() => {

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


// ================================
// DASHBOARD SECURITY
// ================================

if (
  window.location.pathname.includes(
    "dashboard.html"
  )
) {

  onAuthStateChanged(
    auth,
    (user) => {

      if (!user) {

        window.location.href =
          "login.html";

      }

    }
  );

}


// ================================
// DASHBOARD USER DATA
// ================================

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


onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {
      return;
    }


    if (welcomeUser) {

      welcomeUser.textContent =
        `Welcome ${user.email.split("@")[0]} 👋`;

    }


    if (userEmail) {

      userEmail.textContent =
        `Email: ${user.email}`;

    }


    // Firebase से user data पढ़ना

    try {

      const userDoc =
        await getDoc(
          doc(db, "users", user.uid)
        );


      if (userDoc.exists()) {

        const userData =
          userDoc.data();


        if (userPlan) {

          userPlan.textContent =
            "Plan : " +
            (userData.plan ||
             "Free Trial");

        }


        if (userStatus) {

          userStatus.textContent =
            "Status : " +
            (userData.status ||
             "Active") +
            " 🟢";

        }

      }


    } catch (error) {

      console.error(
        "User Data Error:",
        error
      );

    }


    if (joinDate) {

      joinDate.textContent =
        "Joining Date : " +
        new Date(
          user.metadata.creationTime
        ).toLocaleDateString();

    }

  }
);