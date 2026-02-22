import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';

type LoginMode = 'password' | 'magic' | 'magic_sent';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicToken, setMagicToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loginMode, setLoginMode] = useState<LoginMode>('password');
  const { login, sendMagicLink, verifyMagicLink, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    }
  };

  const handleSendMagicLink = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setError('');
    setSuccess('');
    try {
      await sendMagicLink(email);
      setLoginMode('magic_sent');
      setSuccess('Check your email for the login link');
    } catch (e: any) {
      setError(e.message || 'Failed to send magic link');
    }
  };

  const handleVerifyMagicLink = async () => {
    if (!magicToken) {
      setError('Please enter the token from your email');
      return;
    }

    setError('');
    try {
      await verifyMagicLink(magicToken);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message || 'Invalid or expired link');
    }
  };

  const toggleLoginMode = () => {
    setError('');
    setSuccess('');
    if (loginMode === 'password') {
      setLoginMode('magic');
    } else {
      setLoginMode('password');
      setMagicToken('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>feels</Text>
          <Text style={styles.subtitle}>Find your connection</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          {loginMode === 'password' && (
            <>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#888888"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#888888"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.magicLinkButton}
                onPress={toggleLoginMode}
                activeOpacity={0.8}
              >
                <Text style={styles.magicLinkButtonText}>Sign in with email link</Text>
              </TouchableOpacity>
            </>
          )}

          {loginMode === 'magic' && (
            <>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#888888"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleSendMagicLink}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Send Magic Link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.magicLinkButton}
                onPress={toggleLoginMode}
                activeOpacity={0.8}
              >
                <Text style={styles.magicLinkButtonText}>Sign in with password</Text>
              </TouchableOpacity>
            </>
          )}

          {loginMode === 'magic_sent' && (
            <>
              <Text style={styles.magicInstructions}>
                Enter the token from your email to sign in
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Paste token here"
                  placeholderTextColor="#888888"
                  value={magicToken}
                  onChangeText={setMagicToken}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleVerifyMagicLink}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.magicLinkButton}
                onPress={() => setLoginMode('magic')}
                activeOpacity={0.8}
              >
                <Text style={styles.magicLinkButtonText}>Resend magic link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.magicLinkButton}
                onPress={toggleLoginMode}
                activeOpacity={0.8}
              >
                <Text style={styles.magicLinkButtonText}>Sign in with password</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/register" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 48,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 68, 88, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    color: '#FF4458',
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: 'rgba(68, 255, 88, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  successText: {
    color: '#44FF58',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#111111',
    color: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#FF1493',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  magicLinkButton: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  magicLinkButtonText: {
    color: '#FF1493',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  magicInstructions: {
    color: '#888888',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#888888',
  },
  linkText: {
    color: '#FF1493',
    fontWeight: '600',
  },
});
