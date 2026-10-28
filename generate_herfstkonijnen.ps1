Add-Type -AssemblyName System.Drawing

$source = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

public static class HerfstKonijnenStickerGenerator
{
    static readonly Color Ink = Color.FromArgb(83, 61, 48);
    static readonly Color Cream = Color.FromArgb(255, 246, 222);
    static readonly Color Orange = Color.FromArgb(225, 133, 57);
    static readonly Color Gold = Color.FromArgb(230, 177, 64);
    static readonly Color Green = Color.FromArgb(112, 137, 82);
    static readonly Color Red = Color.FromArgb(188, 91, 67);
    static readonly Color Blue = Color.FromArgb(110, 150, 166);
    static readonly Color Brown = Color.FromArgb(143, 98, 65);
    static readonly string[] Ids = {
        "touwbal", "tak", "wortel", "kip", "eikels", "kastanjes", "sjaal", "paraplu",
        "pompoen", "paddenstoel", "nieuwsgierig", "blij", "modder", "lampion", "kussen",
        "knuffel", "stoel", "likmat", "waterbak", "bladerhoop", "goud", "plas", "egel",
        "kastanje_neus", "laarzen", "blaadjes", "kachel", "appel", "heksenhoed", "tennisbal", "eekhoorn"
    };
    static readonly Color[] Badges = {
        Color.FromArgb(249, 218, 173), Color.FromArgb(225, 232, 198), Color.FromArgb(250, 220, 174),
        Color.FromArgb(248, 225, 168), Color.FromArgb(231, 217, 184), Color.FromArgb(238, 207, 165),
        Color.FromArgb(238, 211, 190), Color.FromArgb(205, 225, 231), Color.FromArgb(246, 207, 164),
        Color.FromArgb(230, 215, 187), Color.FromArgb(224, 222, 198), Color.FromArgb(246, 214, 174),
        Color.FromArgb(222, 205, 185), Color.FromArgb(245, 215, 160), Color.FromArgb(231, 216, 205),
        Color.FromArgb(222, 218, 207), Color.FromArgb(225, 218, 196), Color.FromArgb(244, 220, 191),
        Color.FromArgb(205, 224, 221), Color.FromArgb(231, 211, 174), Color.FromArgb(247, 224, 158),
        Color.FromArgb(207, 224, 228), Color.FromArgb(225, 214, 193), Color.FromArgb(240, 205, 163),
        Color.FromArgb(213, 227, 231), Color.FromArgb(243, 218, 171), Color.FromArgb(224, 216, 202),
        Color.FromArgb(244, 211, 159), Color.FromArgb(224, 214, 199), Color.FromArgb(245, 221, 166),
        Color.FromArgb(223, 211, 183)
    };

    static void Fill(Graphics g, Color c, float x, float y, float w, float h)
    {
        using (var b = new SolidBrush(c)) g.FillEllipse(b, x, y, w, h);
    }
    static void Box(Graphics g, Color c, float x, float y, float w, float h)
    {
        using (var b = new SolidBrush(c)) g.FillRectangle(b, x, y, w, h);
    }
    static void Stroke(Graphics g, Color c, float width, float x1, float y1, float x2, float y2)
    {
        using (var p = new Pen(c, width) { StartCap = LineCap.Round, EndCap = LineCap.Round }) g.DrawLine(p, x1, y1, x2, y2);
    }
    static void Ring(Graphics g, Color c, float width, float x, float y, float w, float h)
    {
        using (var p = new Pen(c, width)) g.DrawEllipse(p, x, y, w, h);
    }
    static void Polygon(Graphics g, Color c, params PointF[] pts)
    {
        using (var b = new SolidBrush(c)) g.FillPolygon(b, pts);
    }
    static void Leaf(Graphics g, Color c, float x, float y, float size)
    {
        Polygon(g, c, new PointF(x, y + size * .5f), new PointF(x + size * .22f, y + size * .12f),
            new PointF(x + size * .52f, y), new PointF(x + size * .75f, y + size * .25f),
            new PointF(x + size, y + size * .12f), new PointF(x + size * .84f, y + size * .55f),
            new PointF(x + size * .6f, y + size * .88f), new PointF(x + size * .32f, y + size * .75f));
        Stroke(g, Ink, 1.8f, x + 3, y + size * .58f, x + size - 2, y + size * .35f);
    }
    static void Star(Graphics g, Color c, float cx, float cy, float r)
    {
        var pts = new PointF[10];
        for (int i = 0; i < pts.Length; i++)
        {
            float a = (float)(-Math.PI / 2 + i * Math.PI / 5);
            float d = i % 2 == 0 ? r : r * .43f;
            pts[i] = new PointF(cx + (float)Math.Cos(a) * d, cy + (float)Math.Sin(a) * d);
        }
        Polygon(g, c, pts);
    }
    static void DrawIcon(Graphics g, string id)
    {
        switch (id)
        {
            case "touwbal":
                Fill(g, Orange, 20, 20, 60, 60); Ring(g, Ink, 3, 20, 20, 60, 60);
                for (int i = 0; i < 5; i++) Stroke(g, Cream, 3, 22 + i * 12, 27, 74 - i * 5, 68 - i * 7);
                Stroke(g, Ink, 2, 72, 76, 91, 86); break;
            case "tak":
                Stroke(g, Brown, 8, 15, 75, 84, 23); Stroke(g, Brown, 5, 42, 58, 34, 28); Stroke(g, Brown, 5, 59, 48, 77, 67);
                Leaf(g, Green, 19, 17, 24); Leaf(g, Gold, 68, 57, 22); Leaf(g, Red, 54, 29, 22); break;
            case "wortel":
                Polygon(g, Orange, new PointF(23, 30), new PointF(79, 45), new PointF(46, 86));
                Stroke(g, Ink, 3, 23, 30, 79, 45); Stroke(g, Gold, 2, 44, 49, 51, 53); Stroke(g, Gold, 2, 55, 55, 62, 58);
                Leaf(g, Green, 14, 14, 25); Leaf(g, Green, 41, 12, 24); break;
            case "kip":
                Fill(g, Cream, 24, 31, 54, 50); Fill(g, Gold, 60, 23, 28, 29); Fill(g, Red, 67, 16, 8, 13); Fill(g, Red, 75, 14, 8, 13);
                Polygon(g, Orange, new PointF(87, 34), new PointF(99, 40), new PointF(87, 45)); Fill(g, Ink, 78, 31, 4, 4);
                Stroke(g, Ink, 3, 43, 76, 41, 91); Stroke(g, Ink, 3, 63, 76, 65, 91); break;
            case "eikels": case "kastanjes":
                Fill(g, id == "eikels" ? Brown : Red, 29, 34, 43, 49); Fill(g, Gold, 26, 29, 49, 23); Ring(g, Ink, 3, 29, 34, 43, 49);
                for (int i = 0; i < 3; i++) Stroke(g, Cream, 2, 38 + i * 10, 52, 40 + i * 10, 65);
                Stroke(g, Ink, 4, 49, 29, 52, 20); Leaf(g, Green, 50, 12, 25); break;
            case "sjaal":
                Polygon(g, Red, new PointF(20, 36), new PointF(82, 36), new PointF(76, 58), new PointF(25, 58));
                Polygon(g, Red, new PointF(31, 53), new PointF(50, 55), new PointF(45, 88), new PointF(30, 83));
                Polygon(g, Orange, new PointF(60, 53), new PointF(78, 54), new PointF(87, 81), new PointF(70, 87));
                Stroke(g, Cream, 3, 29, 44, 74, 44); Stroke(g, Cream, 3, 36, 61, 36, 77); Stroke(g, Cream, 3, 75, 60, 81, 76); break;
            case "paraplu":
                using (var p = new Pen(Ink, 3)) g.DrawArc(p, 13, 19, 74, 54, 180, 180);
                Polygon(g, Blue, new PointF(14, 47), new PointF(86, 47), new PointF(76, 65), new PointF(61, 56), new PointF(50, 69), new PointF(38, 56), new PointF(23, 65));
                Stroke(g, Ink, 4, 50, 48, 50, 83); Stroke(g, Ink, 4, 50, 83, 62, 87); break;
            case "pompoen":
                Fill(g, Orange, 23, 31, 54, 53); Fill(g, Red, 36, 25, 31, 62); Fill(g, Gold, 51, 29, 27, 56);
                Ring(g, Ink, 3, 23, 31, 54, 53); Stroke(g, Green, 6, 51, 29, 51, 18); Leaf(g, Green, 53, 12, 20); break;
            case "paddenstoel":
                Box(g, Cream, 42, 48, 19, 36); Fill(g, Cream, 37, 73, 29, 11);
                using (var b = new SolidBrush(Red)) g.FillPie(b, 17, 20, 70, 53, 180, 180);
                using (var p = new Pen(Ink, 3)) g.DrawArc(p, 17, 20, 70, 53, 180, 180);
                Fill(g, Cream, 34, 43, 8, 8); Fill(g, Cream, 58, 35, 9, 9); Fill(g, Cream, 70, 47, 7, 7); break;
            case "nieuwsgierig":
                Ring(g, Ink, 7, 23, 18, 48, 48); Ring(g, Gold, 3, 28, 23, 38, 38); Stroke(g, Ink, 8, 64, 62, 84, 83);
                Star(g, Orange, 78, 26, 13); Fill(g, Cream, 18, 72, 9, 9); break;
            case "blij":
                Fill(g, Gold, 24, 22, 52, 52); Ring(g, Ink, 3, 24, 22, 52, 52); Fill(g, Ink, 37, 40, 5, 7); Fill(g, Ink, 58, 40, 5, 7);
                using (var p = new Pen(Ink, 3)) g.DrawArc(p, 39, 43, 25, 19, 15, 150);
                Star(g, Orange, 82, 31, 10); break;
            case "modder":
                Fill(g, Brown, 13, 53, 76, 30); Fill(g, Red, 23, 28, 24, 48); Fill(g, Blue, 55, 28, 24, 48);
                Ring(g, Ink, 3, 23, 28, 24, 48); Ring(g, Ink, 3, 55, 28, 24, 48);
                for (int i = 0; i < 4; i++) Fill(g, Ink, 25 + i * 15, 66 + (i % 2) * 5, 7, 6); break;
            case "lampion":
                Fill(g, Orange, 28, 29, 47, 53); Ring(g, Ink, 3, 28, 29, 47, 53); Stroke(g, Ink, 3, 51, 29, 51, 18);
                using (var p = new Pen(Ink, 3)) g.DrawArc(p, 40, 11, 23, 18, 180, 180);
                Stroke(g, Cream, 3, 51, 39, 51, 71); Stroke(g, Ink, 3, 36, 82, 67, 82); break;
            case "kussen":
                using (var path = new GraphicsPath()) { path.AddPolygon(new[] { new PointF(27, 24), new PointF(75, 28), new PointF(80, 75), new PointF(25, 78) }); using (var b = new SolidBrush(Cream)) g.FillPath(b, path); using (var p = new Pen(Ink, 4)) g.DrawPath(p, path); }
                Stroke(g, Gold, 3, 36, 37, 68, 65); Stroke(g, Gold, 3, 67, 36, 38, 66); Fill(g, Orange, 46, 45, 10, 10); break;
            case "knuffel":
                Fill(g, Blue, 25, 34, 53, 43); Fill(g, Blue, 22, 24, 22, 24); Fill(g, Blue, 61, 24, 22, 24);
                Fill(g, Cream, 63, 45, 8, 8); Fill(g, Ink, 66, 47, 3, 3); Fill(g, Cream, 69, 57, 6, 5);
                Ring(g, Ink, 3, 25, 34, 53, 43); Stroke(g, Ink, 2, 30, 77, 30, 88); Stroke(g, Ink, 2, 70, 77, 70, 88); break;
            case "stoel":
                Box(g, Red, 26, 27, 49, 9); Box(g, Brown, 29, 37, 8, 42); Box(g, Brown, 66, 37, 8, 42);
                Box(g, Orange, 27, 51, 49, 10); Stroke(g, Ink, 4, 31, 60, 27, 87); Stroke(g, Ink, 4, 70, 60, 75, 87);
                Ring(g, Ink, 3, 25, 26, 52, 44); break;
            case "likmat":
                Fill(g, Red, 20, 25, 62, 55); Ring(g, Ink, 3, 20, 25, 62, 55);
                for (int row = 0; row < 3; row++) for (int col = 0; col < 4; col++) Fill(g, Cream, 30 + col * 13, 36 + row * 12, 6, 6);
                Leaf(g, Green, 67, 12, 19); break;
            case "waterbak":
                using (var b = new SolidBrush(Blue)) g.FillPie(b, 17, 36, 70, 47, 0, 180);
                using (var p = new Pen(Ink, 4)) g.DrawArc(p, 17, 36, 70, 47, 0, 180);
                Stroke(g, Ink, 4, 17, 60, 87, 60); Stroke(g, Cream, 3, 33, 54, 73, 54); Fill(g, Blue, 45, 26, 12, 17); break;
            case "bladerhoop":
                Leaf(g, Gold, 12, 48, 45); Leaf(g, Red, 36, 36, 45); Leaf(g, Green, 52, 48, 39); Leaf(g, Orange, 25, 62, 43);
                Fill(g, Brown, 32, 63, 40, 18); break;
            case "goud":
                Star(g, Gold, 50, 49, 37); Star(g, Cream, 50, 49, 21); Ring(g, Ink, 3, 24, 23, 52, 52);
                for (int i = 0; i < 4; i++) Fill(g, Orange, 13 + i * 22, 17 + (i % 2) * 63, 6, 6); break;
            case "plas":
                using (var b = new SolidBrush(Blue)) g.FillEllipse(b, 12, 59, 78, 23);
                using (var p = new Pen(Ink, 3)) g.DrawEllipse(p, 12, 59, 78, 23);
                Stroke(g, Cream, 3, 31, 68, 48, 68); Stroke(g, Cream, 2, 57, 75, 73, 75);
                Fill(g, Blue, 38, 25, 10, 20); Fill(g, Blue, 59, 36, 7, 14); break;
            case "egel":
                Fill(g, Brown, 22, 35, 60, 43); Fill(g, Cream, 56, 49, 29, 28);
                for (int i = 0; i < 7; i++) Stroke(g, Ink, 3, 28 + i * 7, 40, 22 + i * 8, 20 + (i % 2) * 8);
                Fill(g, Ink, 76, 56, 5, 5); break;
            case "kastanje_neus":
                Fill(g, Brown, 27, 28, 48, 54); Fill(g, Red, 28, 25, 47, 22); Ring(g, Ink, 3, 27, 28, 48, 54);
                Stroke(g, Gold, 2, 42, 49, 56, 53); Stroke(g, Gold, 2, 41, 58, 58, 61); Leaf(g, Green, 61, 12, 23); break;
            case "laarzen":
                Box(g, Blue, 20, 29, 25, 38); Box(g, Red, 55, 29, 25, 38);
                Fill(g, Blue, 18, 55, 38, 24); Fill(g, Red, 52, 55, 38, 24);
                Ring(g, Ink, 3, 18, 29, 27, 51); Ring(g, Ink, 3, 53, 29, 27, 51);
                Stroke(g, Cream, 3, 25, 42, 40, 42); Stroke(g, Cream, 3, 60, 42, 75, 42); break;
            case "blaadjes":
                Leaf(g, Red, 12, 36, 34); Leaf(g, Gold, 45, 19, 39); Leaf(g, Green, 55, 54, 34); Leaf(g, Orange, 20, 65, 34);
                Stroke(g, Ink, 2, 15, 15, 24, 12); Stroke(g, Ink, 2, 82, 30, 91, 27); break;
            case "kachel":
                Box(g, Red, 22, 24, 56, 62); Ring(g, Ink, 4, 22, 24, 56, 62); Box(g, Ink, 31, 43, 38, 33);
                Fill(g, Orange, 39, 51, 23, 23); Polygon(g, Gold, new PointF(50, 44), new PointF(59, 60), new PointF(50, 70), new PointF(43, 59));
                Stroke(g, Cream, 3, 31, 34, 69, 34); break;
            case "appel":
                Fill(g, Red, 23, 31, 54, 53); Fill(g, Red, 37, 24, 30, 24); Ring(g, Ink, 3, 23, 31, 54, 53);
                Stroke(g, Brown, 5, 51, 29, 54, 17); Leaf(g, Green, 55, 13, 23); Fill(g, Cream, 33, 43, 7, 7); break;
            case "heksenhoed":
                Polygon(g, Ink, new PointF(17, 69), new PointF(51, 18), new PointF(83, 69));
                using (var b = new SolidBrush(Ink)) g.FillEllipse(b, 14, 64, 74, 15);
                Polygon(g, Orange, new PointF(31, 62), new PointF(72, 62), new PointF(77, 70), new PointF(26, 70));
                Star(g, Gold, 51, 47, 8); break;
            case "tennisbal":
                Fill(g, Gold, 22, 22, 58, 58); Ring(g, Ink, 3, 22, 22, 58, 58);
                using (var p = new Pen(Cream, 5)) g.DrawArc(p, 29, 25, 45, 52, 115, 130);
                using (var p = new Pen(Cream, 5)) g.DrawArc(p, 28, 25, 45, 52, -65, 130); break;
            case "eekhoorn":
                Fill(g, Orange, 22, 42, 49, 39); Fill(g, Orange, 49, 25, 34, 34); Fill(g, Cream, 57, 31, 19, 19);
                using (var p = new Pen(Brown, 13)) g.DrawArc(p, 10, 19, 51, 63, 190, 300);
                Fill(g, Brown, 19, 63, 31, 20); Fill(g, Gold, 17, 57, 14, 14); Fill(g, Ink, 70, 33, 4, 4);
                Leaf(g, Green, 68, 12, 20); break;
        }
    }

    public static void Generate(string root)
    {
        string folder = Path.Combine(root, "www", "taken", "stickers", "herfstkonijnen");
        string basePath = Path.Combine(folder, "konijnen.png");
        using (var rabbits = new Bitmap(basePath))
        {
            for (int i = 0; i < Ids.Length; i++)
            {
                using (var canvas = new Bitmap(512, 512, PixelFormat.Format32bppArgb))
                using (var g = Graphics.FromImage(canvas))
                {
                    g.Clear(Color.Transparent);
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    using (var badge = new SolidBrush(Badges[i])) g.FillEllipse(badge, 169, 7, 174, 174);
                    using (var outline = new Pen(Color.FromArgb(180, 120, 87, 61), 3)) g.DrawEllipse(outline, 169, 7, 174, 174);
                    g.TranslateTransform(206, 35);
                    g.ScaleTransform(1.02f, 1.02f);
                    DrawIcon(g, Ids[i]);
                    g.ResetTransform();
                    g.DrawImage(rabbits, new Rectangle(36, 74, 440, 440), 0, 0, rabbits.Width, rabbits.Height, GraphicsUnit.Pixel);
                    string output = Path.Combine(folder, Ids[i] + ".png");
                    canvas.Save(output, ImageFormat.Png);
                }
            }
        }
        Console.WriteLine("Generated " + Ids.Length + " stickers in " + folder);
    }
}
'@

Add-Type -TypeDefinition $source -ReferencedAssemblies System.Drawing
[HerfstKonijnenStickerGenerator]::Generate((Get-Location).Path)