import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/endpoints.dart';
import 'anchor_models.dart';

class AnchorRepository {
  final Dio _dio;
  AnchorRepository(this._dio);

  Future<List<Anchor>> list() async {
    final res = await _dio.get(Endpoints.anchors);
    final list = (res.data['anchors'] as List?) ?? const [];
    return list.map((j) => Anchor.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<Anchor> set(AnchorKind kind, double lat, double lng) async {
    final res = await _dio.put(
      Endpoints.anchorByKind(kind.apiValue),
      data: {'lat': lat, 'lng': lng},
    );
    return Anchor.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> delete(AnchorKind kind) async {
    await _dio.delete(Endpoints.anchorByKind(kind.apiValue));
  }
}

final anchorRepositoryProvider = Provider<AnchorRepository>((ref) {
  return AnchorRepository(ref.read(apiClientProvider));
});

/// The current user's LIVE/WORK/PLAY anchors, for display on their profile.
/// Invalidate after editing an anchor to refresh.
final myAnchorsProvider = FutureProvider<List<Anchor>>((ref) {
  return ref.read(anchorRepositoryProvider).list();
});
