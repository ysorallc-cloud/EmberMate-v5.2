#!/bin/bash
# Create a feature graphic for Google Play Store
# Size: 1024 x 500 px
# Background: Dark teal #243028

# Create a solid color background
sips --setProperty format png --padToHeightWidth 500 1024 /Users/ambercook/embermate-v5/assets/icon.png --out /Users/ambercook/embermate-v5/assets/feature-graphic-base.png --padColor 243028

# Resize and center the icon on the banner
# First create a smaller version of the icon (200x200)
sips -z 200 200 /Users/ambercook/embermate-v5/assets/icon.png --out /Users/ambercook/embermate-v5/assets/icon-200.png

echo "Feature graphic base created!"
echo "Location: /Users/ambercook/embermate-v5/assets/feature-graphic-base.png"
echo ""
echo "Note: This creates a basic banner. For best results, you may want to:"
echo "1. Add text 'EmberMate - Your Personal Health Companion'"
echo "2. Use an online tool like Canva or Figma for professional text overlay"
