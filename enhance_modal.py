"""
Simple Python script to safely add camera and voice elements to the medication modal.
This avoids the file corruption issues with large HTML replacements.
"""

import re

def add_camera_to_modal():
    """Add camera feed and voice UI to the medication reminder modal"""
    
    file_path = 'app/templates/senior/dashboard.html'
    
    # Read the file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already added
    if 'reminderCameraFeed' in content:
        print("✓ Camera elements already present in modal")
        return
    
    # Find the modal body section (after the pill icon)
    # We'll add the camera section before the alert
    
    camera_html = '''                <!-- Camera Feed for Auto-Verification -->
                <div class="card border-info mb-3" id="cameraSection" style="display: none;">
                    <div class="card-header bg-light">
                        <h6 class="mb-0">
                            <i class="fas fa-camera me-2"></i>Camera Verification
                            <span id="voiceIndicator" class="float-end text-success" style="display: none;">
                                <i class="fas fa-microphone pulsing"></i> Listening...
                            </span>
                        </h6>
                    </div>
                    <div class="card-body p-2">
                        <!-- Live Camera Feed -->
                        <div class="position-relative mb-2">
                            <video id="reminderCameraFeed" class="w-100 rounded" style="max-height: 300px; background: #000;" autoplay playsinline></video>
                            
                            <!-- Verification Status Overlay -->
                            <div id="verificationStatus" class="position-absolute top-50 start-50 translate-middle text-white p-2 rounded" style="display: none; background: rgba(0,0,0,0.8);">
                                <i class="fas fa-spinner fa-spin me-2"></i>Verifying...
                            </div>
                        </div>
                        
                        <!-- Verification Result -->
                        <div id="verificationResult" style="display: none;">
                            <div class="alert alert-sm mb-1" id="verificationAlert" style="padding: 0.5rem;">
                                <i class="fas fa-circle-notch fa-spin me-2"></i>
                                <span id="verificationMessage">Checking...</span>
                            </div>
                        </div>
                        
                        <!-- Instructions -->
                        <p class="text-muted small mb-0 text-center">
                            <i class="fas fa-info-circle me-1"></i>
                            Say "I took it" or show medication to camera
                        </p>
                    </div>
                </div>
                
'''
    
    # Find where to insert (before the warning alert)
    pattern = r'(\s+<div class="alert alert-warning mb-4" role="alert">)'
    
    if re.search(pattern, content):
        # Insert camera section before the alert
        modified_content = re.sub(pattern, camera_html + r'\1', content, count=1)
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(modified_content)
        
        print("✅ Camera and voice elements added to modal!")
        print("   - Added camera feed video element")
        print("   - Added voice indicator")
        print("   - Added verification status display")
        
        return True
    else:
        print("❌ Could not find insertion point in modal")
        return False

def add_voice_script():
    """Add voice_commands.js script tag"""
    
    file_path = 'app/templates/senior/dashboard.html'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already added
    if 'voice_commands.js' in content:
        print("✓ Voice script already present")
        return
    
    # Add after auto_verification.js
    pattern = r'(<script src="{{ url_for\(\'static\', filename=\'js/auto_verification\.js\'\) }}"></script>)'
    replacement = r'\1\n<script src="{{ url_for(\'static\', filename=\'js/voice_commands.js\') }}"></script>'
    
    if re.search(pattern, content):
        modified_content = re.sub(pattern, replacement, content, count=1)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(modified_content)
        
        print("✅ Voice commands script added!")
        return True
    else:
        print("❌ Could not find auto_verification.js script tag")
        return False

def add_pulsing_animation():
    """Add CSS for pulsing microphone icon"""
    
    file_path = 'app/static/css/style.css'
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if already added
        if 'pulsing' in content:
            print("✓ Pulsing animation already present")
            return
        
        animation_css = '''
/* Pulsing animation for voice indicator */
@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.1); }
}

.pulsing {
    animation: pulse 1.5s ease-in-out infinite;
}
'''
        
        # Append to end of file
        with open(file_path, 'a', encoding='utf-8') as f:
            f.write(animation_css)
        
        print("✅ Pulsing animation CSS added!")
        return True
        
    except FileNotFoundError:
        print("⚠️  style.css not found, skipping CSS animation")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("Adding Camera & Voice UI to Medication Modal")
    print("=" * 60)
    print()
    
    # Step 1: Add camera section to modal
    print("Step 1: Adding camera feed to modal...")
    add_camera_to_modal()
    print()
    
    # Step 2: Add voice script
    print("Step 2: Adding voice commands script...")
    add_voice_script()
    print()
    
    # Step 3: Add CSS animation
    print("Step 3: Adding pulsing animation...")
    add_pulsing_animation()
    print()
    
    print("=" * 60)
    print("✅ Phase 2 UI Enhancement Complete!")
    print("=" * 60)
    print("\nNext: Restart Flask server to see changes")
