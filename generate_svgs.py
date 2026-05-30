import os

def create_svg(filename, text, bg_color):
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
  <rect width="100%" height="100%" fill="{bg_color}" />
  <rect width="90%" height="90%" x="5%" y="5%" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="10 10"/>
  <text x="50%" y="45%" font-family="Arial" font-size="48" fill="#fff" text-anchor="middle" font-weight="bold">AI GENERATED SAMPLE</text>
  <text x="50%" y="55%" font-family="Arial" font-size="32" fill="#fff" text-anchor="middle">{text}</text>
</svg>"""
    with open(f"generated_samples/{filename}", "w") as f:
        f.write(svg)

create_svg("01_white_background.svg", "White Background", "#2c3e50")
create_svg("02_theme_luxury_velvet.svg", "Theme: Luxury Velvet", "#8e44ad")
create_svg("03_theme_marble_surface.svg", "Theme: Marble Surface", "#95a5a6")
create_svg("04_creative_beach_sunset.svg", "Creative: Beach Sunset", "#e67e22")
create_svg("05_creative_neon_cyberpunk.svg", "Creative: Neon Cyberpunk", "#c0392b")
create_svg("06_model_front_view.svg", "Model: Front View", "#16a085")
create_svg("07_model_side_angle.svg", "Model: Side Angle (45-deg)", "#27ae60")
create_svg("08_model_closeup.svg", "Model: Close-up", "#2980b9")

print("Created 8 SVG placeholders.")
