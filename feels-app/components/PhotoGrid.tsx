import { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { profileApi } from '@/api/client';
import { PlusIcon, XIcon, RefreshIcon } from '@/components/Icons';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';

interface Photo {
  id: string;
  url: string;
  position: number;
}

interface PhotoGridProps {
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  maxPhotos?: number;
}

export default function PhotoGrid({
  photos,
  onPhotosChange,
  maxPhotos = 5,
}: PhotoGridProps) {
  const [uploading, setUploading] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [selectedForSwap, setSelectedForSwap] = useState<number | null>(null);

  const pickImage = async (position: number) => {
    // If in swap mode, handle swap
    if (selectedForSwap !== null) {
      await handleSwap(selectedForSwap, position);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to upload photos.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0], position);
    }
  };

  const uploadPhoto = async (
    asset: ImagePicker.ImagePickerAsset,
    position: number
  ) => {
    setUploading(position);

    try {
      const formData = new FormData();
      const uri = asset.uri;
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('photo', {
        uri,
        name: filename,
        type,
      } as any);
      formData.append('position', String(position));

      const response = await profileApi.uploadPhoto(formData);
      const newPhoto: Photo = response.data;

      // Update photos array
      const updatedPhotos = [...photos];
      const existingIndex = updatedPhotos.findIndex(
        (p) => p.position === position
      );
      if (existingIndex >= 0) {
        updatedPhotos[existingIndex] = newPhoto;
      } else {
        updatedPhotos.push(newPhoto);
      }
      updatedPhotos.sort((a, b) => a.position - b.position);
      onPhotosChange(updatedPhotos);
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(
        'Upload Failed',
        error.response?.data?.error || 'Failed to upload photo. Please try again.'
      );
    } finally {
      setUploading(null);
    }
  };

  const deletePhoto = async (photoId: string) => {
    Alert.alert('Delete Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(photoId);
          try {
            await profileApi.deletePhoto(photoId);
            const updatedPhotos = photos.filter((p) => p.id !== photoId);
            onPhotosChange(updatedPhotos);
          } catch (error: any) {
            console.error('Delete error:', error);
            Alert.alert(
              'Delete Failed',
              error.response?.data?.error ||
                'Failed to delete photo. Please try again.'
            );
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  };

  const startReorder = () => {
    if (photos.length < 2) {
      Alert.alert('Cannot Reorder', 'You need at least 2 photos to reorder.');
      return;
    }
    setReordering(true);
    setSelectedForSwap(null);
  };

  const cancelReorder = () => {
    setReordering(false);
    setSelectedForSwap(null);
  };

  const handlePhotoTap = (position: number) => {
    const photo = getPhotoAtPosition(position);

    if (reordering) {
      // Reorder mode
      if (!photo) return; // Can't select empty slots

      if (selectedForSwap === null) {
        setSelectedForSwap(position);
      } else if (selectedForSwap === position) {
        setSelectedForSwap(null);
      } else {
        handleSwap(selectedForSwap, position);
      }
    } else {
      // Normal mode
      if (photo) {
        deletePhoto(photo.id);
      } else {
        pickImage(position);
      }
    }
  };

  const handleSwap = async (fromPosition: number, toPosition: number) => {
    const fromPhoto = getPhotoAtPosition(fromPosition);
    const toPhoto = getPhotoAtPosition(toPosition);

    if (!fromPhoto || !toPhoto) {
      setSelectedForSwap(null);
      return;
    }

    // Optimistically update UI
    const updatedPhotos = photos.map((p) => {
      if (p.position === fromPosition) {
        return { ...p, position: toPosition };
      }
      if (p.position === toPosition) {
        return { ...p, position: fromPosition };
      }
      return p;
    });
    updatedPhotos.sort((a, b) => a.position - b.position);
    onPhotosChange(updatedPhotos);
    setSelectedForSwap(null);

    // Persist to backend
    try {
      const orderedIds = updatedPhotos.map((p) => p.id);
      await profileApi.reorderPhotos(orderedIds);
    } catch (error: any) {
      console.error('Reorder error:', error);
      // Revert on error
      onPhotosChange(photos);
      Alert.alert('Reorder Failed', 'Failed to save new order. Please try again.');
    }
  };

  const getPhotoAtPosition = (position: number): Photo | undefined => {
    return photos.find((p) => p.position === position);
  };

  return (
    <View>
      {/* Reorder controls */}
      {photos.length >= 2 && (
        <View style={styles.reorderControls}>
          {reordering ? (
            <>
              <Text style={styles.reorderHint}>
                {selectedForSwap !== null
                  ? 'Tap another photo to swap'
                  : 'Tap a photo to select'}
              </Text>
              <TouchableOpacity onPress={cancelReorder}>
                <Text style={styles.doneButton}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.reorderButton} onPress={startReorder}>
              <RefreshIcon size={16} color={colors.primary.DEFAULT} />
              <Text style={styles.reorderText}>Reorder</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.grid}>
        {Array.from({ length: maxPhotos }, (_, index) => {
          const photo = getPhotoAtPosition(index);
          const isUploading = uploading === index;
          const isDeleting = photo && deleting === photo.id;
          const isSelected = reordering && selectedForSwap === index;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.slot,
                isSelected && styles.slotSelected,
                reordering && !photo && styles.slotDisabled,
              ]}
              onPress={() => handlePhotoTap(index)}
              activeOpacity={0.8}
              disabled={isUploading || isDeleting || (reordering && !photo)}
            >
              {photo ? (
                <>
                  <Image
                    source={{ uri: photo.url }}
                    style={styles.photo}
                    contentFit="cover"
                  />
                  {isDeleting ? (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator color={colors.text.primary} />
                    </View>
                  ) : !reordering ? (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deletePhoto(photo.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <XIcon size={14} color={colors.text.primary} />
                    </TouchableOpacity>
                  ) : null}
                  {index === 0 && (
                    <View style={styles.mainBadge}>
                      <Text style={styles.mainBadgeText}>Main</Text>
                    </View>
                  )}
                  {isSelected && (
                    <View style={styles.selectedOverlay}>
                      <Text style={styles.selectedText}>Selected</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.placeholder}>
                  {isUploading ? (
                    <ActivityIndicator color={colors.primary.DEFAULT} />
                  ) : (
                    <PlusIcon size={24} color={colors.text.tertiary} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reorderControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reorderText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.primary.DEFAULT,
  },
  reorderHint: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  doneButton: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.primary.DEFAULT,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slot: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  slotSelected: {
    borderWidth: 3,
    borderColor: colors.primary.DEFAULT,
  },
  slotDisabled: {
    opacity: 0.3,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
  },
  deleteButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  mainBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232, 93, 117, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
});
