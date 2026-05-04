import React from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { CheckCircle, Package, ArrowRight, Home } from 'lucide-react-native';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const OrderSuccessScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { orderId } = route.params || {};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <CheckCircle size={64} color={colors.primary} />
        </View>

        <CustomText variant="h1" style={[styles.title, { color: colors.foreground }]}>
          Order Placed!
        </CustomText>
        
        <CustomText style={[styles.subtitle, { color: colors.muted }]}>
          Your order has been placed successfully and is now being processed.
        </CustomText>

        {orderId && (
          <View style={[styles.orderCard, { backgroundColor: colors.glass, borderColor: colors.border }]}>
            <View style={styles.orderCardIcon}>
              <Package size={20} color={colors.primary} />
            </View>
            <View style={styles.orderCardContent}>
              <CustomText style={[styles.orderLabel, { color: colors.muted }]}>Order ID</CustomText>
              <CustomText style={[styles.orderId, { color: colors.foreground }]}>
                #{orderId.slice(-8).toUpperCase()}
              </CustomText>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.glass }]}>
        <CustomButton
          title="Track Order"
          style={styles.trackBtn}
          onPress={() => {
            navigation.navigate('Me');
          }}
        >
          <ArrowRight size={20} color="#FFF" style={{ marginLeft: 8 }} />
        </CustomButton>

        <CustomButton
          title="Back to Home"
          variant="outline"
          style={[styles.homeBtn, { borderColor: colors.border }]}
          textStyle={{ color: colors.foreground }}
          onPress={() => {
            navigation.navigate('HomeMain');
          }}
        >
          <Home size={20} color={colors.foreground} style={{ marginRight: 8 }} />
        </CustomButton>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
    maxWidth: 320,
  },
  orderCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(230, 126, 34, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  orderCardContent: {
    flex: 1,
  },
  orderLabel: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    gap: 16,
  },
  trackBtn: {
    width: '100%',
  },
  homeBtn: {
    width: '100%',
  },
});

export default OrderSuccessScreen;
