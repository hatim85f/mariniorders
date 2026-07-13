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
import OwnerProfitsScreen from "./src/screens/OwnerProfitsScreen";
import OwnerConfirmationsScreen from "./src/screens/OwnerConfirmationsScreen";
import StockScreen from "./src/screens/StockScreen";

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
  const [view, setView] = useState("orders");

  const handleNavigate = (key) => {
    const validKeys = isOwnerMode
      ? ["orders", "history", "profits", "confirmations", "stock"]
      : ["orders", "history", "stock"];
    if (!validKeys.includes(key)) return;
    setView(key);
    setSelectedOrder(null);
  };

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
        {view === "profits" ? (
          <OwnerProfitsScreen view={view} onNavigate={handleNavigate} onLoggedOut={handleLoggedOut} />
        ) : view === "confirmations" ? (
          <OwnerConfirmationsScreen view={view} onNavigate={handleNavigate} onLoggedOut={handleLoggedOut} />
        ) : view === "stock" ? (
          <StockScreen view={view} onNavigate={handleNavigate} onLoggedOut={handleLoggedOut} isOwner />
        ) : selectedOrder ? (
          <OwnerOrderDetailScreen
            order={selectedOrder}
            onBack={() => setSelectedOrder(null)}
            onLoggedOut={handleLoggedOut}
            view={view}
            onNavigate={handleNavigate}
          />
        ) : (
          <OwnerOrderListScreen
            view={view}
            onNavigate={handleNavigate}
            onOpenOrder={setSelectedOrder}
            onLoggedOut={handleLoggedOut}
          />
        )}
        <StatusBar style="auto" />
      </>
    );
  }

  if (view === "stock") {
    return (
      <>
        <StockScreen view={view} onNavigate={handleNavigate} onLoggedOut={handleLoggedOut} />
        <StatusBar style="auto" />
      </>
    );
  }

  if (selectedOrder) {
    return (
      <>
        <OrderDetailScreen
          order={selectedOrder}
          onBack={() => setSelectedOrder(null)}
          onLoggedOut={handleLoggedOut}
          view={view}
          onNavigate={handleNavigate}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <>
      <OrderListScreen view={view} onNavigate={handleNavigate} onOpenOrder={setSelectedOrder} onLoggedOut={handleLoggedOut} />
      <StatusBar style="auto" />
    </>
  );
}
