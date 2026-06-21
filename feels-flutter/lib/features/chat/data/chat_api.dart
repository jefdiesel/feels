import 'dart:io' as io;

import 'package:dio/dio.dart';

import '../../../core/api/endpoints.dart';
import '../domain/models/message.dart';

class ChatApi {
  final Dio _dio;

  ChatApi({required Dio dio}) : _dio = dio;

  /// Fetch paginated messages for a match/conversation.
  Future<MessagesResponse> getMessages(
    String matchId, {
    int limit = 50,
    int offset = 0,
  }) async {
    final response = await _dio.get(
      Endpoints.matchMessages(matchId),
      queryParameters: {'limit': limit, 'offset': offset},
    );
    return MessagesResponse.fromJson(response.data as Map<String, dynamic>);
  }

  /// Send a text or image message.
  Future<Message> sendMessage(
    String matchId, {
    String? content,
    String? imageUrl,
    String? encryptedContent,
  }) async {
    final response = await _dio.post(
      Endpoints.matchMessages(matchId),
      data: {
        if (content != null) 'content': content,
        if (imageUrl != null) 'image_url': imageUrl,
        if (encryptedContent != null) 'encrypted_content': encryptedContent,
      },
    );
    return Message.fromJson(response.data as Map<String, dynamic>);
  }

  /// Enable image sharing for the current user in this match.
  Future<void> enableImages(String matchId) async {
    await _dio.post(Endpoints.matchImagesEnable(matchId));
  }

  /// Disable image sharing for the current user in this match.
  Future<void> disableImages(String matchId) async {
    await _dio.post(Endpoints.matchImagesDisable(matchId));
  }

  /// Upload an image for this match conversation.
  Future<String> uploadImage(String matchId, io.File file) async {
    final formData = FormData.fromMap({
      'image': await MultipartFile.fromFile(
        file.path,
        filename: file.path.split('/').last,
      ),
    });
    final response = await _dio.post(
      Endpoints.matchImagesUpload(matchId),
      data: formData,
    );
    final data = response.data as Map<String, dynamic>;
    return data['url'] as String;
  }

  /// Send typing indicator.
  Future<void> sendTyping(String matchId, {required bool isTyping}) async {
    await _dio.post(
      Endpoints.matchTyping(matchId),
      data: {'is_typing': isTyping},
    );
  }
}
