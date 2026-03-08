import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Spacing } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { Photo } from '../utils/photoStorage';

interface PhotoGalleryProps {
  photos: Photo[];
  onPhotoPress?: (photo: Photo) => void;
  onPhotoDeleted?: () => void;
  emptyMessage?: string;
}

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - (Spacing.lg * 2) - (Spacing.md * 2)) / 3;

export default function PhotoGallery({ photos, onPhotoPress, emptyMessage }: PhotoGalleryProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!photos || photos.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>{'\uD83D\uDCF7'}</Text>
        <Text style={styles.emptyText}>{emptyMessage || 'No photos yet'}</Text>
      </View>
    );
  }

  const renderPhoto = ({ item }: { item: Photo }) => (
    <TouchableOpacity
      style={styles.photoContainer}
      onPress={() => onPhotoPress?.(item)}
      activeOpacity={0.7}
      accessibilityLabel={`Photo${item.caption ? `, ${item.caption}` : ''}`}
      accessibilityRole="button"
    >
      <Image source={{ uri: item.uri }} style={styles.photo} />
      {item.caption && (
        <View style={styles.noteBadge}>
          <Text style={styles.noteIcon}>{'\uD83D\uDCDD'}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={photos}
      renderItem={renderPhoto}
      keyExtractor={(item) => item.id}
      numColumns={3}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    />
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  row: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    backgroundColor: c.surface,
  },
  noteBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteIcon: {
    fontSize: 12,
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 14,
    color: c.textSecondary,
  },
});
