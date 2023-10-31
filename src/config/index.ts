import firebase from "@react-native-firebase/app";
import "@react-native-firebase/auth";
import "@react-native-firebase/firestore";

const RNfirebaseConfig = {
  apiKey: "........",
  authDomain: "note-app-rn.firebaseapp.com",
  projectId: "note-app-rn",
  storageBucket: "note-app-rn.appspot.com",
  messagingSenderId: ".....",
  appId: "......",
};

let app;
if (firebase.apps.length === 0) {
  app = firebase.initializeApp(RNfirebaseConfig);
} else {
  app = firebase.app();
}
