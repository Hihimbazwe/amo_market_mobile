import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

const PresenceDot = ({ size = 12, color = '#10b981', borderSize = 2, borderColor = '#000' }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 2,
                        duration: 1500,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(opacityAnim, {
                        toValue: 0,
                        duration: 1500,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 0.4,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );

        pulse.start();

        return () => pulse.stop();
    }, [pulseAnim, opacityAnim]);

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Pulsing ring */}
            <Animated.View
                style={[
                    styles.pulse,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: color,
                        opacity: opacityAnim,
                        transform: [{ scale: pulseAnim }],
                    },
                ]}
            />
            {/* Central static dot */}
            <View
                style={[
                    styles.dot,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: color,
                        borderWidth: borderSize,
                        borderColor: borderColor,
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        position: 'absolute',
    },
    pulse: {
        position: 'absolute',
    },
});

export default PresenceDot;
