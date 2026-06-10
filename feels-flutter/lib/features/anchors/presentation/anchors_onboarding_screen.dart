import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../data/anchor_models.dart';
import '../data/anchor_repository.dart';

/// Three-step onboarding flow: LIVE -> WORK -> HANGOUT. Each step shows an OSM
/// map centered on Manhattan; the user taps to drop a pin, then advances.
/// Pins are sent to the backend, which snaps them to the closest NYC NTA.
class AnchorsOnboardingScreen extends ConsumerStatefulWidget {
  final VoidCallback onCompleted;
  const AnchorsOnboardingScreen({super.key, required this.onCompleted});

  @override
  ConsumerState<AnchorsOnboardingScreen> createState() =>
      _AnchorsOnboardingScreenState();
}

class _AnchorsOnboardingScreenState
    extends ConsumerState<AnchorsOnboardingScreen> {
  static const _nycCenter = LatLng(40.7580, -73.9855);
  // Loose NYC bounds — matches server-side anchor.inNYC.
  static const _nycMinLat = 40.45, _nycMaxLat = 41.00;
  static const _nycMinLng = -74.30, _nycMaxLng = -73.65;

  final _steps = AnchorKind.values;
  int _step = 0;
  LatLng? _pin;
  bool _saving = false;
  String? _error;

  bool _isInNYC(LatLng p) =>
      p.latitude >= _nycMinLat &&
      p.latitude <= _nycMaxLat &&
      p.longitude >= _nycMinLng &&
      p.longitude <= _nycMaxLng;

  Future<void> _saveAndNext() async {
    if (_pin == null) return;
    if (!_isInNYC(_pin!)) {
      setState(() => _error = 'Pick a spot in NYC.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final repo = ref.read(anchorRepositoryProvider);
      final saved = await repo.set(_steps[_step], _pin!.latitude, _pin!.longitude);
      if (!mounted) return;
      final next = _step + 1;
      if (next >= _steps.length) {
        widget.onCompleted();
        return;
      }
      setState(() {
        _step = next;
        _pin = null;
        _saving = false;
      });
      if (saved.ntaName != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${_steps[_step - 1].label}: ${saved.ntaName}')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = 'Could not save anchor. Try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final kind = _steps[_step];
    return PopScope(
      canPop: false, // anchors are required to use the app
      child: Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          title: Text('Anchor ${_step + 1} of ${_steps.length} · ${kind.label}'),
        ),
        body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(kind.prompt, style: Theme.of(context).textTheme.titleMedium),
          ),
          Expanded(
            child: FlutterMap(
              options: MapOptions(
                initialCenter: _nycCenter,
                initialZoom: 11,
                onTap: (_, p) => setState(() => _pin = p),
              ),
              children: [
                TileLayer(
                  urlTemplate:
                      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'app.feelsfun.feels',
                ),
                if (_pin != null)
                  MarkerLayer(markers: [
                    Marker(
                      point: _pin!,
                      width: 40,
                      height: 40,
                      child: const Icon(Icons.location_pin,
                          size: 40, color: Colors.redAccent),
                    ),
                  ]),
              ],
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: FilledButton(
                onPressed: _pin == null || _saving ? null : _saveAndNext,
                child: Text(_saving
                    ? 'Saving…'
                    : _step == _steps.length - 1
                        ? 'Finish'
                        : 'Next'),
              ),
            ),
            ),
          ],
        ),
      ),
    );
  }
}
