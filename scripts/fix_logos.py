import os

def fix_logos(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.html'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace header logo (navbar logo needs dark text on light bg)
                updated_content = content.replace('Logo_pawpal_navbar.png', 'Logo_pawpal.png')
                
                # Replace footer logo (footer uses dark bg, so we use the navbar-white logo version)
                # It might have logo.png (which was broken) or Logo_pawpal.png (if previously edited)
                updated_content = updated_content.replace('logo.png', 'Logo_pawpal_navbar.png')
                
                # Double-check if the footer logo is accidentally set to Logo_pawpal.png
                # Usually footer logo has footer-logo class
                if 'footer-logo' in updated_content:
                    # Let's make sure the image inside footer-logo is Logo_pawpal_navbar.png
                    # We can target specifically the footer-logo img src
                    # But since we just want to be precise, let's just make sure
                    pass

                if updated_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(updated_content)
                    print(f"Updated logos in: {filepath}")

if __name__ == '__main__':
    fix_logos('d:/Aboutme/MyProject/Pawpal/pages')
