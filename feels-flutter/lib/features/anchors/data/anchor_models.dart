/// Models for the NYC hyper-local matching anchors feature.
///
/// An anchor is a place a user lives, works, or hangs out. Matching uses
/// subway-reachability between anchors instead of straight-line distance.
library;

enum AnchorKind { live, work, play }

extension AnchorKindX on AnchorKind {
  String get apiValue => switch (this) {
        AnchorKind.live => 'LIVE',
        AnchorKind.work => 'WORK',
        AnchorKind.play => 'PLAY',
      };

  String get label => switch (this) {
        AnchorKind.live => 'Live',
        AnchorKind.work => 'Work',
        AnchorKind.play => 'Play',
      };

  String get prompt => switch (this) {
        AnchorKind.live => 'Drop a pin where you live.',
        AnchorKind.work => 'Drop a pin where you work or spend most weekdays.',
        AnchorKind.play => 'Drop a pin on a neighborhood where you spend your free time.',
      };

  static AnchorKind fromApi(String v) => switch (v) {
        'LIVE' => AnchorKind.live,
        'WORK' => AnchorKind.work,
        'PLAY' => AnchorKind.play,
        _ => throw ArgumentError('unknown anchor kind: $v'),
      };
}

class Anchor {
  final String id;
  final AnchorKind kind;
  final double lat;
  final double lng;
  final String? ntaId;
  final String? ntaName;
  final String? borough;

  /// Other users who share this anchor's neighborhood.
  final int locals;

  const Anchor({
    required this.id,
    required this.kind,
    required this.lat,
    required this.lng,
    this.ntaId,
    this.ntaName,
    this.borough,
    this.locals = 0,
  });

  factory Anchor.fromJson(Map<String, dynamic> j) => Anchor(
        id: j['id'] as String,
        kind: AnchorKindX.fromApi(j['kind'] as String),
        lat: (j['lat'] as num).toDouble(),
        lng: (j['lng'] as num).toDouble(),
        ntaId: j['nta_id'] as String?,
        ntaName: j['nta_name'] as String?,
        borough: j['borough'] as String?,
        locals: j['locals'] as int? ?? 0,
      );
}

/// A NYC neighborhood with how many users are anchored there (Explore surface).
class NeighborhoodStat {
  final String id;
  final String name;
  final String borough;
  final String densityTier;
  final int users;

  const NeighborhoodStat({
    required this.id,
    required this.name,
    required this.borough,
    required this.densityTier,
    required this.users,
  });

  factory NeighborhoodStat.fromJson(Map<String, dynamic> j) => NeighborhoodStat(
        id: j['id'] as String,
        name: j['name'] as String,
        borough: j['borough'] as String? ?? '',
        densityTier: j['density_tier'] as String? ?? '',
        users: j['users'] as int? ?? 0,
      );
}
