import React, { useMemo, useState, useContext } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { Lock, ArrowLeft } from 'lucide-react-native';
import { NavigationRefContext } from '../../context/NavigationRefContext';

const { width } = Dimensions.get('window');

const GRID_SIZE = 3;
const DOT_RADIUS = 16;
const BOARD_SIZE = Math.min(width - 72, 320);

const PatternEntryScreen = ({ onSuccess, onSetupComplete, isSetup = false, isModal = false, onCancel, onUsePasswordPress, onBackPress, customTitle, customSubtitle }) => {
  const { colors } = useTheme();
  const navigationRef = useContext(NavigationRefContext);
  const [pattern, setPattern] = useState([]);
  const [confirmPattern, setConfirmPattern] = useState([]);
  const [step, setStep] = useState(isSetup ? 'enter' : 'verify');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const dots = useMemo(() => {
    const gap = BOARD_SIZE / (GRID_SIZE + 1);
    return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => ({
      id: index,
      x: gap * ((index % GRID_SIZE) + 1),
      y: gap * (Math.floor(index / GRID_SIZE) + 1),
    }));
  }, []);

  const selectedDots = pattern.map((id) => dots.find((dot) => dot.id === id)).filter(Boolean);
  const linePoints = selectedDots.map((dot) => `${dot.x},${dot.y}`).join(' ');

  const addDotFromTouch = (evt) => {
    if (loading) return;
    const { locationX, locationY } = evt.nativeEvent;
    const hit = dots.find((dot) => {
      const distance = Math.sqrt(Math.pow(locationX - dot.x, 2) + Math.pow(locationY - dot.y, 2));
      return distance <= DOT_RADIUS * 2.2;
    });

    if (hit && !pattern.includes(hit.id)) {
      setPattern((current) => [...current, hit.id]);
      setError('');
    }
  };

  const completePattern = async () => {
    if (loading || pattern.length === 0) return;

    if (pattern.length < 4) {
      setError('Pattern must have at least 4 dots');
      setPattern([]);
      return;
    }

    if (isSetup) {
      if (step === 'enter') {
        setConfirmPattern(pattern);
        setPattern([]);
        setStep('confirm');
        return;
      }

      if (JSON.stringify(pattern) !== JSON.stringify(confirmPattern)) {
        setError('Patterns do not match');
        setPattern([]);
        setConfirmPattern([]);
        setStep('enter');
        return;
      }

      onSetupComplete?.(confirmPattern.join(','));
      return;
    }

    setLoading(true);
    const success = await onSuccess?.(pattern.join(','));
    setLoading(false);
    setPattern([]);
    setError(success ? '' : 'Incorrect Pattern');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, isModal && { paddingTop: 20 }]}>
      {/* Back button - show during setup OR when unlock provides an onBackPress handler */}
      {(isSetup || !!onBackPress) && (
        <TouchableOpacity
          onPress={() => {
            if (!isSetup && onBackPress) {
              onBackPress();
              return;
            }
            if (onCancel) {
              onCancel();
              return;
            }
            if (navigationRef?.current) {
              navigationRef.current.reset({
                index: 0,
                routes: [{ name: 'MainApp', params: { screen: 'Home' } }],
              });
            }
          }}
          style={[styles.backButton, { backgroundColor: colors.glass }, isModal && { top: 20 }]}
        >
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
      )}

      <View style={styles.header}>
        <Lock size={44} color={colors.primary} style={{ marginBottom: 12 }} />
        <CustomText variant="h2" style={{ textAlign: 'center', marginBottom: 4 }}>
          {customTitle || (isSetup ? (step === 'enter' ? 'Draw Your Pattern' : 'Confirm Pattern') : 'Enter Pattern')}
        </CustomText>
        <CustomText style={{ color: colors.muted, textAlign: 'center', fontSize: 13 }}>
          {customSubtitle || (isSetup ? 'Connect at least 4 dots' : 'Draw your pattern to unlock')}
        </CustomText>
      </View>

      <View
        style={[styles.board, { backgroundColor: colors.card, borderColor: colors.border }]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={addDotFromTouch}
        onResponderMove={addDotFromTouch}
        onResponderRelease={completePattern}
      >
        <Svg width={BOARD_SIZE} height={BOARD_SIZE}>
          {linePoints ? (
            <Polyline
              points={linePoints}
              fill="none"
              stroke={colors.primary}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {dots.map((dot) => {
            const selected = pattern.includes(dot.id);
            return (
              <Circle
                key={dot.id}
                cx={dot.x}
                cy={dot.y}
                r={DOT_RADIUS}
                fill={selected ? colors.primary : colors.background}
                stroke={selected ? colors.primary : colors.muted}
                strokeWidth={2}
              />
            );
          })}
        </Svg>
      </View>

      {error ? (
        <CustomText style={{ color: '#EF4444', textAlign: 'center', marginBottom: 12, fontWeight: '600' }}>
          {error}
        </CustomText>
      ) : null}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => {
          setPattern([]);
          setError('');
        }}
      >
        <CustomText style={{ color: '#fff', fontWeight: '700' }}>Clear</CustomText>
      </TouchableOpacity>

      {/* Cancel button for verification mode */}
      {!isSetup && onCancel && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
        >
          <CustomText style={styles.cancelButtonText}>
            Cancel
          </CustomText>
        </TouchableOpacity>
      )}

      {/* Use password instead link */}
      {!isSetup && (
        <TouchableOpacity
          style={styles.usePasswordButton}
          onPress={() => {
            if (onUsePasswordPress) {
              onUsePasswordPress();
              return;
            }
            if (navigationRef?.current) {
              navigationRef.current.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          }}
        >
          <CustomText style={[styles.usePasswordButtonText, { color: colors.primary }]}>
            Use password instead
          </CustomText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 24,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  usePasswordButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  usePasswordButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PatternEntryScreen;
