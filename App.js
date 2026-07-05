import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Platform } from "react-native";
import { getStoredToken, getOwnerToken } from "./src/api";
import { colors } from "./src/theme";
import PinLoginScreen from "./src/screens/PinLoginScreen";
import OrderListScreen from "./src/screens/OrderListScreen";
import OrderDetailScreen from "./src/screens/OrderDetailScreen";
import OwnerOrderListScreen from "./src/screens/OwnerOrderListScreen";
import OwnerOrderDetailScreen from "./src/screens/OwnerOrderDetailScreen";

// Owner dashboard (Hatim's full-detail view) is reached via ?owner=1 on web —
// same app, same PIN-pad component, different backend role. Not applicable
// on native since there's no URL there; the employee flow is the only one
// installed on her phone anyway.
const isOwnerMode = Platform.OS === "web" && typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("owner") === "1";

export default function App() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    (isOwnerMode ? getOwnerToken() : getStoredToken()).then((token) => {
      setLoggedIn(!!token);
      setCheckingSession(false);
    });
  }, []);

  const handleLoggedOut = () => {
    setLoggedIn(false);
    setSelectedOrder(null);
  };

  if (checkingSession) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
        <StatusBar style="auto" />
      </View>
    );
  }

  if (!loggedIn) {
    return (
      <>
        <PinLoginScreen mode={isOwnerMode ? "owner" : "employee"} onLoggedIn={() => setLoggedIn(true)} />
        <StatusBar style="auto" />
      </>
    );
  }

  if (isOwnerMode) {
    return (
      <>
        {selectedOrder ? (
          <OwnerOrderDetailScreen order={selectedOrder} onBack={() => setSelectedOrder(null)} onLoggedOut={handleLoggedOut} />
        ) : (
          <OwnerOrderListScreen onOpenOrder={setSelectedOrder} onLoggedOut={handleLoggedOut} />
        )}
        <StatusBar style="auto" />
      </>
    );
  }

  if (selectedOrder) {
    return (
      <>
        <OrderDetailScreen order={selectedOrder} onBack={() => setSelectedOrder(null)} onLoggedOut={handleLoggedOut} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <>
      <OrderListScreen onOpenOrder={setSelectedOrder} onLoggedOut={handleLoggedOut} />
      <StatusBar style="auto" />
    </>
  );
}
