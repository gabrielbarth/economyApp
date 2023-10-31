import { useState } from "react";
import { Button, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import database from "@react-native-firebase/database";

export function HomePage({ navigation }) {
  const handleCamera = () => {
    navigation.navigate("Camera");
  };

  database()
    .ref("/coupons")
    .once("value")
    .then((snapshot) => {
      console.log("Data: ", snapshot.val());
    });

  return (
    <View style={styles.container}>
      <Button title="Ir para camera" onPress={handleCamera} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: "flex-end",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
});
