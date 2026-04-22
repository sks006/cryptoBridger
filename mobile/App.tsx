import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar, 
  Animated, 
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Smartphone, Zap, Wifi, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

type State = 'idle' | 'scanning' | 'processing' | 'success' | 'error';

export default function App() {
  const [state, setState] = useState<State>('idle');
  const [amount, setAmount] = useState(24.50);
  const ringAnim = new Animated.Value(0);

  useEffect(() => {
    if (state === 'scanning') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      ringAnim.stopAnimation();
    }
  }, [state]);

  const handleTap = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setState('scanning');
    
    // Simulate real-world timing
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setState('processing');
      
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setState('success');
      }, 1500);
    }, 2000);
  };

  const reset = () => {
    setState('idle');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Decor */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <ChevronLeft color="#666" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Tap to Pay</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total to Pay</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>$</Text>
            <Text style={styles.amountText}>{amount.toFixed(2)}</Text>
            <Text style={styles.currencyCode}>USDC</Text>
          </View>
        </View>

        {/* Interaction Area */}
        <View style={styles.interactionArea}>
          {state === 'scanning' && (
            <Animated.View 
              style={[
                styles.ring, 
                { 
                  transform: [{ scale: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2] }) }],
                  opacity: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] })
                }
              ]} 
            />
          )}

          <TouchableOpacity 
            style={[
              styles.mainButton,
              state === 'success' && styles.successButton,
              state === 'error' && styles.errorButton,
            ]}
            onPress={state === 'idle' ? handleTap : reset}
            activeOpacity={0.8}
          >
            {state === 'idle' && (
              <View style={styles.buttonContent}>
                <Smartphone color="white" size={48} />
                <View style={styles.wifiIcon}>
                  <Wifi color="white" size={20} opacity={0.5} />
                </View>
              </View>
            )}

            {state === 'scanning' && (
              <View style={styles.buttonContent}>
                <Wifi color="white" size={48} />
              </View>
            )}

            {state === 'processing' && (
              <ActivityIndicator color="white" size="large" />
            )}

            {state === 'success' && (
              <CheckCircle2 color="white" size={48} />
            )}
          </TouchableOpacity>

          <Text style={styles.statusText}>
            {state === 'idle' && 'Tap phone to reader'}
            {state === 'scanning' && 'Hold near terminal...'}
            {state === 'processing' && 'Validating swap...'}
            {state === 'success' && 'Payment Complete!'}
          </Text>
        </View>

        {/* Card Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
             <View style={styles.cardLogo}>
                <Zap color="white" size={14} />
                <Text style={styles.cardLogoText}>LAMYT</Text>
             </View>
             <Text style={styles.cardType}>CREDIT</Text>
          </View>
          <Text style={styles.cardNumber}>**** **** **** 4291</Text>
        </View>
      </View>

      {/* Manual Reset button for success state */}
      {state === 'success' && (
        <TouchableOpacity style={styles.resetButton} onPress={reset}>
           <Text style={styles.resetButtonText}>New Transaction</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  glowTop: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    backgroundColor: '#3b82f6',
    borderRadius: 150,
    opacity: 0.1,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 300,
    height: 300,
    backgroundColor: '#10b981',
    borderRadius: 150,
    opacity: 0.1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  amountCard: {
    alignItems: 'center',
    marginBottom: 60,
  },
  amountLabel: {
    color: '#666',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    color: '#666',
    fontSize: 24,
    marginRight: 4,
  },
  amountText: {
    color: 'white',
    fontSize: 56,
    fontWeight: '800',
  },
  currencyCode: {
    color: '#666',
    fontSize: 16,
    marginLeft: 8,
  },
  interactionArea: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  mainButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  successButton: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  errorButton: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  buttonContent: {
    alignItems: 'center',
  },
  wifiIcon: {
    position: 'absolute',
    top: -15,
    right: -25,
    transform: [{ rotate: '45deg' }],
  },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  statusText: {
    marginTop: 30,
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
  },
  cardInfo: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLogoText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
  cardType: {
    color: '#666',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#262626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardNumber: {
    color: '#666',
    fontSize: 18,
    letterSpacing: 4,
    fontFamily: 'Courier',
  },
  resetButton: {
    margin: 24,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  }
});
