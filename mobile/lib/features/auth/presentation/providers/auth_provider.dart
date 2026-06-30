import 'package:flutter_riverpod/flutter_riverpod.dart';

// Placeholder auth provider — will connect to Firebase Auth
final authStateProvider = StateProvider<AuthState?>((ref) => null);

class AuthState {
  final String userId;
  final String phoneHash;
  final bool isPremium;

  const AuthState({
    required this.userId,
    required this.phoneHash,
    this.isPremium = false,
  });
}
