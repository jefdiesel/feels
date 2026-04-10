/// All API endpoint path constants for the feels backend.
///
/// Base URL is configured via --dart-define at build time.
/// All paths are relative to /api/v1.
class Endpoints {
  Endpoints._();

  static const String _base = '/api/v1';

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  static const String authMagicSend = '$_base/auth/magic/send';
  static const String authMagicVerify = '$_base/auth/magic/verify';
  static const String authApple = '$_base/auth/apple';
  static const String authRefresh = '$_base/auth/refresh';
  static const String authPhoneSend = '$_base/auth/phone/send';
  static const String authPhoneLogin = '$_base/auth/phone/login';
  static const String authDeleteAccount = '$_base/auth/account';

  // ---------------------------------------------------------------------------
  // Feed
  // ---------------------------------------------------------------------------

  static const String feed = '$_base/feed';
  static const String feedDailyPicks = '$_base/feed/daily-picks';
  static const String feedRewind = '$_base/feed/rewind';

  static String feedLike(String userId) => '$_base/feed/like/$userId';
  static String feedSuperlike(String userId) => '$_base/feed/superlike/$userId';
  static String feedSuperlikeMessage(String userId) =>
      '$_base/feed/superlike/$userId/message';
  static String feedPass(String userId) => '$_base/feed/pass/$userId';

  // ---------------------------------------------------------------------------
  // Matches & Messages
  // ---------------------------------------------------------------------------

  static const String matches = '$_base/matches';

  static String match(String matchId) => '$_base/matches/$matchId';
  static String matchMessages(String matchId) =>
      '$_base/matches/$matchId/messages';
  static String matchTyping(String matchId) =>
      '$_base/matches/$matchId/typing';
  static String matchImagesEnable(String matchId) =>
      '$_base/matches/$matchId/images/enable';
  static String matchImagesDisable(String matchId) =>
      '$_base/matches/$matchId/images/disable';
  static String matchImagesUpload(String matchId) =>
      '$_base/matches/$matchId/images/upload';

  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------

  static const String profile = '$_base/profile';
  static const String profilePreferences = '$_base/profile/preferences';
  static const String profilePhotos = '$_base/profile/photos';
  static const String profilePhotosReorder = '$_base/profile/photos/reorder';
  static const String profileVerify = '$_base/profile/verify';
  static const String profileAnalytics = '$_base/profile/analytics';
  static const String profileShareLink = '$_base/profile/share-link';

  static String profilePhoto(String photoId) =>
      '$_base/profile/photos/$photoId';

  // ---------------------------------------------------------------------------
  // Safety
  // ---------------------------------------------------------------------------

  static String block(String userId) => '$_base/block/$userId';
  static String report(String userId) => '$_base/report/$userId';

  // ---------------------------------------------------------------------------
  // Credits & Subscription
  // ---------------------------------------------------------------------------

  static const String credits = '$_base/credits';
  static const String subscription = '$_base/subscription';

  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------

  static const String paymentsPlans = '$_base/payments/plans';
  static const String paymentsCheckout = '$_base/payments/checkout';
  static const String paymentsPortal = '$_base/payments/portal';
  static const String paymentsSubscription = '$_base/payments/subscription';

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  static const String settingsNotifications = '$_base/settings/notifications';
  static const String settingsPrivacy = '$_base/settings/privacy';

  // ---------------------------------------------------------------------------
  // Push Notifications
  // ---------------------------------------------------------------------------

  static const String pushRegister = '$_base/push/register';

  // ---------------------------------------------------------------------------
  // Referral
  // ---------------------------------------------------------------------------

  static const String referralCode = '$_base/referral/code';
  static const String referralRedeem = '$_base/referral/redeem';
  static const String referralStats = '$_base/referral/stats';

  // ---------------------------------------------------------------------------
  // Encryption Keys
  // ---------------------------------------------------------------------------

  static const String keysPublic = '$_base/keys/public';

  // ---------------------------------------------------------------------------
  // WebSocket
  // ---------------------------------------------------------------------------

  static const String ws = '$_base/ws';
}
