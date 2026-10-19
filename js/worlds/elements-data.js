// Periodic table data for the Chemistry Lab.
// Row: [number, symbol, name, atomic mass, family, state at room temperature, discovered, what it looks like, fun fact, where we use it]
// Masses in [brackets] are the mass number of the longest-lived isotope.
const NEVER_SEEN='Never seen by anyone—only a few atoms have ever existed, for a split second.';
const LAB='Science research only';
const ROWS=[
[1,"H","Hydrogen","1.008","nonmetal","gas","1766","Invisible gas. Glows pink-purple in an electric tube.","The lightest and most common element in the universe. Stars like our Sun are mostly hydrogen!","Water, rocket fuel, the Sun’s energy"],
[2,"He","Helium","4.0026","noble","gas","1868","Invisible gas. Glows peach-pink in an electric tube.","Helium is lighter than air, so helium balloons float up and away.","Party balloons, airships, cooling MRI scanners"],
[3,"Li","Lithium","6.94","alkali","solid","1817","Soft, silvery metal—so light it floats on oil.","The lightest metal of all. It is soft enough to cut with a knife.","Phone and electric car batteries"],
[4,"Be","Beryllium","9.0122","alkaline","solid","1798","Hard, steel-gray metal.","Very light but very stiff. The James Webb Space Telescope’s mirrors are made from it.","Space telescope mirrors, X-ray windows"],
[5,"B","Boron","10.81","metalloid","solid","1808","Hard, black, shiny chunks.","Boron helps make glass that does not crack in a hot oven.","Oven-proof glass, slime (borax), strong magnets"],
[6,"C","Carbon","12.011","nonmetal","solid","Ancient times","Black, soft graphite—or a sparkling, clear diamond.","Pencil “lead” and diamonds are both made of pure carbon!","Pencils, diamonds, every living thing"],
[7,"N","Nitrogen","14.007","nonmetal","gas","1772","Invisible gas. Glows orange-pink in an electric tube.","About 78% of the air you breathe is nitrogen.","Plant fertilizer, keeping chip bags fresh"],
[8,"O","Oxygen","15.999","nonmetal","gas","1774","Invisible gas. Glows lilac in an electric tube. Liquid oxygen is pale blue.","Your body needs oxygen with every single breath.","Breathing, fire, rocket engines"],
[9,"F","Fluorine","18.998","halogen","gas","1886","Pale yellow gas.","The most reactive element—it reacts with almost everything it touches.","Toothpaste (fluoride), non-stick pans"],
[10,"Ne","Neon","20.180","noble","gas","1898","Invisible gas. Glows bright red-orange in a tube.","Glowing “neon signs” are named after it.","Neon signs, lasers"],
[11,"Na","Sodium","22.990","alkali","solid","1807","Soft, silvery metal kept under oil.","Sodium joined with chlorine makes the salt you put on food.","Table salt, yellow streetlights"],
[12,"Mg","Magnesium","24.305","alkaline","solid","1755","Light, shiny, silvery metal.","It burns with a dazzling white light, so it is used in fireworks.","Fireworks, light bikes and laptops, green leaves"],
[13,"Al","Aluminium","26.982","post","solid","1825","Light, silvery metal.","It was once more precious than gold! Now it is in every kitchen.","Soda cans, kitchen foil, airplanes"],
[14,"Si","Silicon","28.085","metalloid","solid","1824","Shiny, blue-gray crystal.","Beach sand is mostly silicon joined with oxygen.","Computer chips, solar panels, glass"],
[15,"P","Phosphorus","30.974","nonmetal","solid","1669","Red phosphorus is a deep red powder.","The striking strip on a matchbox contains red phosphorus.","Matches, plant fertilizer, your bones and DNA"],
[16,"S","Sulfur","32.06","nonmetal","solid","Ancient times","Bright yellow crystals.","Sulfur is found around volcanoes. Rotten-egg smells come from sulfur.","Matches, rubber tires, medicines"],
[17,"Cl","Chlorine","35.45","halogen","gas","1774","Yellow-green gas.","Chlorine keeps swimming pool water clean.","Pool cleaning, table salt, plastic pipes"],
[18,"Ar","Argon","39.95","noble","gas","1894","Invisible gas. Glows violet in a tube.","Almost 1% of the air around you is argon.","Light bulbs, welding"],
[19,"K","Potassium","39.098","alkali","solid","1807","Soft, silvery metal kept under oil.","Bananas are full of potassium. The pure metal fizzes and burns with a lilac flame on water.","Plant fertilizer, healthy muscles"],
[20,"Ca","Calcium","40.078","alkaline","solid","1808","Dull, silvery metal.","Your bones and teeth are full of calcium.","Bones, chalk, cement, milk"],
[21,"Sc","Scandium","44.956","transition","solid","1879","Silvery-white metal.","Mixed with aluminium, it makes super-light bike frames and baseball bats.","Sports gear, stadium lights"],
[22,"Ti","Titanium","47.867","transition","solid","1791","Strong, silvery-gray metal.","As strong as steel but much lighter.","Airplanes, bone implants, white paint"],
[23,"V","Vanadium","50.942","transition","solid","1801","Hard, silvery-gray metal.","A little vanadium makes steel tools extra tough.","Tool steel, giant batteries"],
[24,"Cr","Chromium","51.996","transition","solid","1797","Mirror-shiny, silvery metal.","Chrome gives bikes their mirror shine. Rubies are red because of chromium!","Shiny plating, stainless steel"],
[25,"Mn","Manganese","54.938","transition","solid","1774","Hard, brittle, gray metal.","It makes steel strong, and your body needs a tiny bit too.","Steel, batteries"],
[26,"Fe","Iron","55.845","transition","solid","Ancient times","Gray metal that rusts reddish-brown.","Earth’s core is mostly iron. Your blood uses iron to carry oxygen.","Steel, bridges, cars, your blood"],
[27,"Co","Cobalt","58.933","transition","solid","1735","Hard, bluish-silver metal.","It gives glass and paint a deep “cobalt blue” color.","Batteries, blue glass, magnets"],
[28,"Ni","Nickel","58.693","transition","solid","1751","Silvery metal with a warm, golden tinge.","Many coins contain nickel.","Coins, stainless steel, batteries"],
[29,"Cu","Copper","63.546","transition","solid","Ancient times","Shiny, reddish-orange metal.","The Statue of Liberty is made of copper—it slowly turned green.","Electric wires, water pipes, coins"],
[30,"Zn","Zinc","65.38","transition","solid","1746","Bluish-silver metal.","A thin zinc coat stops iron from rusting.","Rust protection, sunscreen, batteries"],
[31,"Ga","Gallium","69.723","post","solid","1875","Silvery metal that melts in your hand.","Gallium melts at 30 °C—warm enough to melt in your palm!","LED lights, phone chips"],
[32,"Ge","Germanium","72.630","metalloid","solid","1886","Shiny, gray-white crystal.","Mendeleev predicted it existed 15 years before anyone found it.","Fiber-optic cables, night-vision lenses"],
[33,"As","Arsenic","74.922","metalloid","solid","Ancient times","Gray crystal that looks like metal.","It is famous as a poison in old mystery stories.","Electronics, protecting wood"],
[34,"Se","Selenium","78.971","nonmetal","solid","1817","Gray, shiny chunks (it can also be a red powder).","It carries electricity better when light shines on it.","Glass color, solar cells, vitamins"],
[35,"Br","Bromine","79.904","halogen","liquid","1826","Dark red-brown liquid with orange vapor.","One of only two elements that are liquid at room temperature.","Fire safety, medicines"],
[36,"Kr","Krypton","83.798","noble","gas","1898","Invisible gas. Glows white-lilac in a tube.","Its name means “the hidden one” in Greek. (It is not Superman’s kryptonite!)","Camera flashes, warm windows"],
[37,"Rb","Rubidium","85.468","alkali","solid","1861","Soft, silvery metal sealed in glass.","It bursts into flames in air, so it is sealed inside glass.","Atomic clocks"],
[38,"Sr","Strontium","87.62","alkaline","solid","1790","Soft, pale-yellow silvery metal.","Strontium makes fireworks glow bright red.","Red fireworks, emergency flares"],
[39,"Y","Yttrium","88.906","transition","solid","1794","Silvery metal.","Named after Ytterby, a tiny Swedish village that gave its name to four elements!","Screen colors, lasers"],
[40,"Zr","Zirconium","91.224","transition","solid","1789","Gray-white, shiny metal.","Cubic zirconia jewels sparkle like diamonds but are made with zirconium.","Sparkly jewels, nuclear reactors"],
[41,"Nb","Niobium","92.906","transition","solid","1801","Gray metal that can be colored like a rainbow.","It is used in super-cold magnets inside hospital MRI scanners.","MRI magnets, jewelry, rocket nozzles"],
[42,"Mo","Molybdenum","95.95","transition","solid","1781","Silvery-gray metal.","It handles extreme heat without melting.","Strong steel, engine parts"],
[43,"Tc","Technetium","[98]","transition","solid","1937","Silvery-gray metal (radioactive).","The very first element made by people in a laboratory.","Medical body scans"],
[44,"Ru","Ruthenium","101.07","transition","solid","1844","Hard, silvery-white metal.","It makes pen tips and electric switches last longer.","Electronics, pen tips"],
[45,"Rh","Rhodium","102.91","transition","solid","1803","Bright, silvery metal.","One of the most expensive metals in the world.","Car exhaust cleaners, mirrors"],
[46,"Pd","Palladium","106.42","transition","solid","1803","Silvery-white metal.","It soaks up hydrogen gas like a sponge.","Car exhaust cleaners, jewelry"],
[47,"Ag","Silver","107.87","transition","solid","Ancient times","Bright, shiny white metal.","The best metal of all at carrying electricity.","Jewelry, coins, mirrors"],
[48,"Cd","Cadmium","112.41","transition","solid","1817","Soft, bluish-silver metal.","Artists used it to make bright yellow paint.","Batteries, yellow paints"],
[49,"In","Indium","114.82","post","solid","1863","Very soft, shiny silver metal.","Bend a bar of indium and it “cries” with a tiny squeak.","Touch screens"],
[50,"Sn","Tin","118.71","post","solid","Ancient times","Silvery metal.","Mixed with copper, tin makes bronze—it gave the Bronze Age its name.","Food cans, solder, bronze"],
[51,"Sb","Antimony","121.76","metalloid","solid","Ancient times","Shiny, silvery, flaky crystal.","Ancient Egyptians used it as black eye makeup.","Fire-safe materials, batteries"],
[52,"Te","Tellurium","127.60","metalloid","solid","1782","Silvery-white, shiny crystal.","Its name comes from “Tellus”, the Latin word for Earth.","Solar panels, rewritable discs"],
[53,"I","Iodine","126.90","halogen","solid","1811","Dark, shiny purple-black crystals.","Gently warmed, it turns straight into a purple vapor.","Cleaning cuts, iodized salt"],
[54,"Xe","Xenon","131.29","noble","gas","1898","Invisible gas. Glows bright blue in a tube.","Xenon powers ion engines that push spacecraft.","Car headlights, spacecraft engines"],
[55,"Cs","Caesium","132.91","alkali","solid","1860","Soft, gold-colored metal sealed in glass.","It melts on a hot day (28 °C) and explodes in water.","The world’s most accurate clocks"],
[56,"Ba","Barium","137.33","alkaline","solid","1808","Soft, silvery metal.","Barium makes fireworks glow green.","Green fireworks, X-ray drinks at the doctor"],
[57,"La","Lanthanum","138.91","lanthanide","solid","1839","Soft, silvery-white metal.","The first of the “rare earth” metals.","Camera lenses, hybrid car batteries"],
[58,"Ce","Cerium","140.12","lanthanide","solid","1803","Silvery metal that sparks when scraped.","Lighter flints make sparks because of cerium.","Lighter flints, polishing glass"],
[59,"Pr","Praseodymium","140.91","lanthanide","solid","1885","Silvery metal.","It is used in goggles that protect welders’ eyes.","Strong magnets, safety goggles"],
[60,"Nd","Neodymium","144.24","lanthanide","solid","1885","Silvery metal.","It makes the strongest permanent magnets on Earth.","Super magnets, headphones, electric motors"],
[61,"Pm","Promethium","[145]","lanthanide","solid","1945","Metal that glows faintly (radioactive).","Named after Prometheus, who brought fire to people in Greek myths.","Long-life batteries"],
[62,"Sm","Samarium","150.36","lanthanide","solid","1879","Silvery metal.","It makes magnets that keep working even when very hot.","Magnets, medicine"],
[63,"Eu","Europium","151.96","lanthanide","solid","1901","Silvery metal.","It glows red under UV light and helps stop fake Euro banknotes.","Banknote security, red screen light"],
[64,"Gd","Gadolinium","157.25","lanthanide","solid","1880","Silvery-white metal.","It helps doctors take clearer MRI pictures.","MRI scans"],
[65,"Tb","Terbium","158.93","lanthanide","solid","1843","Silvery-gray metal.","It makes the green glow in some screens and lamps.","Green light, speakers"],
[66,"Dy","Dysprosium","162.50","lanthanide","solid","1886","Bright silvery metal.","Its name means “hard to get” in Greek.","Electric car motors"],
[67,"Ho","Holmium","164.93","lanthanide","solid","1878","Silvery metal.","It has the strongest magnetic power of any element.","Medical lasers, magnets"],
[68,"Er","Erbium","167.26","lanthanide","solid","1843","Silvery metal.","It turns glass a pretty pink color.","Internet fiber cables, pink glass"],
[69,"Tm","Thulium","168.93","lanthanide","solid","1879","Silvery-gray metal.","One of the rarest of the rare earth metals.","Portable X-ray machines"],
[70,"Yb","Ytterbium","173.05","lanthanide","solid","1878","Soft, silvery metal.","It is used in some of the most accurate clocks ever built.","Atomic clocks, lasers"],
[71,"Lu","Lutetium","174.97","lanthanide","solid","1907","Silvery-white metal.","The last lanthanide—and one of the hardest to separate from the others.","Cancer treatment, fuel making"],
[72,"Hf","Hafnium","178.49","transition","solid","1923","Silvery-gray metal.","Named after Copenhagen, whose Latin name is Hafnia.","Computer chips, submarines"],
[73,"Ta","Tantalum","180.95","transition","solid","1802","Very hard, gray-blue metal.","It does not react with the body, so it is safe for implants.","Phone parts, body implants"],
[74,"W","Tungsten","183.84","transition","solid","1783","Steel-gray metal.","It has the highest melting point of any metal: 3,422 °C!","Light bulb filaments, drill tips"],
[75,"Re","Rhenium","186.21","transition","solid","1925","Silvery-gray metal.","One of the last natural elements to be discovered.","Jet engines"],
[76,"Os","Osmium","190.23","transition","solid","1803","Bluish-silver metal.","The densest element—a soda can full of it would weigh about 8 kg.","Pen tips, electric contacts"],
[77,"Ir","Iridium","192.22","transition","solid","1803","Silvery-white metal.","Found in a rock layer left by the asteroid that ended the dinosaurs.","Spark plugs, pen tips"],
[78,"Pt","Platinum","195.08","transition","solid","1735","Shiny silver-white metal.","Rarer than gold, and it never rusts.","Jewelry, car exhaust cleaners"],
[79,"Au","Gold","196.97","transition","solid","Ancient times","Shiny, yellow metal.","Gold never rusts—ancient gold treasures still shine today.","Jewelry, electronics, medals"],
[80,"Hg","Mercury","200.59","transition","liquid","Ancient times","Shiny, silvery liquid metal.","The only metal that is liquid at room temperature.","Old thermometers, some lamps"],
[81,"Tl","Thallium","204.38","post","solid","1861","Soft, gray metal.","Its name comes from a Greek word for a green twig—it burns with a green flame.","Electronics, special glass"],
[82,"Pb","Lead","207.2","post","solid","Ancient times","Soft, dull blue-gray metal.","Lead blocks X-rays, so dentists cover you with a lead apron.","X-ray shields, car batteries"],
[83,"Bi","Bismuth","208.98","post","solid","1753","Silvery metal that grows rainbow staircase crystals.","Its crystals look like tiny rainbow staircases!","Tummy medicine, safe fishing weights"],
[84,"Po","Polonium","[209]","post","solid","1898","Silvery metal that glows blue (very radioactive).","Discovered by Marie Curie and named after her home country, Poland.","Removing dust from camera lenses"],
[85,"At","Astatine","[210]","halogen","solid","1940","Never seen—it is far too radioactive to collect.","Only a pinch exists in the whole Earth’s crust at any moment.","Cancer research"],
[86,"Rn","Radon","[222]","noble","gas","1899","Invisible, radioactive gas.","It seeps out of some rocks, so people test their homes for it.","Science research"],
[87,"Fr","Francium","[223]","alkali","solid","1939","Never seen—scientists only trap a few thousand atoms at a time.","Its longest-lasting form fades away in about 22 minutes.",LAB],
[88,"Ra","Radium","[226]","alkaline","solid","1898","Silvery-white metal that glows faint blue.","Discovered by Marie and Pierre Curie. It glows in the dark.","Cancer treatment"],
[89,"Ac","Actinium","[227]","actinide","solid","1899","Silvery metal that glows pale blue.","It glows in the dark because it is so radioactive.","Cancer treatment research"],
[90,"Th","Thorium","232.04","actinide","solid","1829","Silvery metal.","Named after Thor, the Norse god of thunder.","Lantern mantles, future nuclear power"],
[91,"Pa","Protactinium","231.04","actinide","solid","1913","Shiny, silvery metal.","One of the rarest natural elements.",LAB],
[92,"U","Uranium","238.03","actinide","solid","1789","Silvery-gray metal.","A small lump can make as much energy as tons of coal.","Nuclear power plants"],
[93,"Np","Neptunium","[237]","actinide","solid","1940","Silvery metal.","Named after the planet Neptune, because it comes after uranium (Uranus).","Science research"],
[94,"Pu","Plutonium","[244]","actinide","solid","1940","Silvery metal that feels warm from its own energy.","It powers space probes like Voyager and the Curiosity Mars rover.","Spacecraft power"],
[95,"Am","Americium","[243]","actinide","solid","1944","Silvery-white metal.","A tiny speck is inside many smoke detectors.","Smoke detectors"],
[96,"Cm","Curium","[247]","actinide","solid","1944","Silvery metal that glows in the dark.","Named after Marie and Pierre Curie.","Powering space instruments"],
[97,"Bk","Berkelium","[247]","actinide","solid","1949","Silvery metal.","Named after Berkeley, California, where it was first made.","Making heavier elements"],
[98,"Cf","Californium","[251]","actinide","solid","1950","Silvery metal.","One of the most expensive materials on Earth.","Finding gold and oil, starting reactors"],
[99,"Es","Einsteinium","[252]","actinide","solid","1952","Metal that glows blue in the dark.","Named after Albert Einstein. Only tiny specks have ever been made.",LAB],
[100,"Fm","Fermium","[257]","actinide","solid","1952",NEVER_SEEN,"Named after Enrico Fermi, who built the first nuclear reactor.",LAB],
[101,"Md","Mendelevium","[258]","actinide","solid","1955",NEVER_SEEN,"Named after Dmitri Mendeleev, who made the first periodic table.",LAB],
[102,"No","Nobelium","[259]","actinide","solid","1966",NEVER_SEEN,"Named after Alfred Nobel, who started the Nobel Prizes.",LAB],
[103,"Lr","Lawrencium","[266]","actinide","solid","1961",NEVER_SEEN,"Named after Ernest Lawrence, who invented an atom smasher.",LAB],
[104,"Rf","Rutherfordium","[267]","transition","unknown","1964",NEVER_SEEN,"Named after Ernest Rutherford, who discovered the center of the atom.",LAB],
[105,"Db","Dubnium","[268]","transition","unknown","1968",NEVER_SEEN,"Named after Dubna, a science city in Russia.",LAB],
[106,"Sg","Seaborgium","[269]","transition","unknown","1974",NEVER_SEEN,"Named after chemist Glenn Seaborg while he was still alive!",LAB],
[107,"Bh","Bohrium","[270]","transition","unknown","1981",NEVER_SEEN,"Named after Niels Bohr, who pictured electrons moving in rings.",LAB],
[108,"Hs","Hassium","[269]","transition","unknown","1984",NEVER_SEEN,"Named after Hesse, the German state where it was made.",LAB],
[109,"Mt","Meitnerium","[278]","transition","unknown","1982",NEVER_SEEN,"Named after Lise Meitner, who helped explain how atoms split.",LAB],
[110,"Ds","Darmstadtium","[281]","transition","unknown","1994",NEVER_SEEN,"Named after Darmstadt, the German city where it was made.",LAB],
[111,"Rg","Roentgenium","[282]","transition","unknown","1994",NEVER_SEEN,"Named after Wilhelm Röntgen, who discovered X-rays.",LAB],
[112,"Cn","Copernicium","[285]","transition","unknown","1996",NEVER_SEEN,"Named after Copernicus, who showed that Earth travels around the Sun.",LAB],
[113,"Nh","Nihonium","[286]","post","unknown","2004",NEVER_SEEN,"The first element discovered in Asia. “Nihon” means Japan.",LAB],
[114,"Fl","Flerovium","[289]","post","unknown","1999",NEVER_SEEN,"Named after the Flerov lab in Russia, where it was made.",LAB],
[115,"Mc","Moscovium","[290]","post","unknown","2003",NEVER_SEEN,"Named after the Moscow region in Russia.",LAB],
[116,"Lv","Livermorium","[293]","post","unknown","2000",NEVER_SEEN,"Named after the Livermore lab in California.",LAB],
[117,"Ts","Tennessine","[294]","halogen","unknown","2010",NEVER_SEEN,"Named after the US state of Tennessee.",LAB],
[118,"Og","Oganesson","[294]","noble","unknown","2002",NEVER_SEEN,"The heaviest element ever made, named after scientist Yuri Oganessian.",LAB]
];

export const FAMILIES={
  alkali:{name:'Alkali metals',short:'Alkali',color:'#ff6b6b',about:'Soft, super-reactive metals. Many fizz and pop in water!'},
  alkaline:{name:'Alkaline earth metals',short:'Alkaline earth',color:'#ffa94d',about:'Shiny metals found in rocks, shells, and your bones.'},
  transition:{name:'Transition metals',short:'Transition',color:'#ffd43b',about:'Strong, shiny metals like iron, copper, silver, and gold.'},
  post:{name:'Post-transition metals',short:'Other metals',color:'#69db7c',about:'Softer metals like aluminium, tin, and lead.'},
  metalloid:{name:'Metalloids',short:'Metalloids',color:'#38d9a9',about:'Half metal, half nonmetal—perfect for computer chips.'},
  nonmetal:{name:'Nonmetals',short:'Nonmetals',color:'#4dabf7',about:'The elements of life: hydrogen, carbon, nitrogen, oxygen, and more.'},
  halogen:{name:'Halogens',short:'Halogens',color:'#748ffc',about:'Very reactive elements that love to join with metals to make salts.'},
  noble:{name:'Noble gases',short:'Noble gases',color:'#b197fc',about:'Calm gases that almost never react. Many glow in electric tubes.'},
  lanthanide:{name:'Lanthanides',short:'Lanthanides',color:'#f783ac',about:'“Rare earth” metals used in magnets, screens, and lasers.'},
  actinide:{name:'Actinides',short:'Actinides',color:'#e599f7',about:'Heavy, radioactive metals. Most are made in laboratories.'}
};

// Elements found in the human body (major ones first).
export const BODY_ELEMENTS=new Set([8,6,1,7,20,15,19,16,11,17,12,26,30,29,53,34,9,25,27,42,24]);

const EXCEPTIONS={24:[2,8,13,1],29:[2,8,18,1],41:[2,8,18,12,1],42:[2,8,18,13,1],44:[2,8,18,15,1],45:[2,8,18,16,1],46:[2,8,18,18],47:[2,8,18,18,1],57:[2,8,18,18,9,2],58:[2,8,18,19,9,2],64:[2,8,18,25,9,2],78:[2,8,18,32,17,1],79:[2,8,18,32,18,1],89:[2,8,18,32,18,9,2],90:[2,8,18,32,18,10,2],91:[2,8,18,32,20,9,2],92:[2,8,18,32,21,9,2],93:[2,8,18,32,22,9,2],96:[2,8,18,32,25,9,2],103:[2,8,18,32,32,8,3]};
function shellsFor(z){
  if(EXCEPTIONS[z])return EXCEPTIONS[z];
  const subshells=[];for(let n=1;n<=7;n++)for(let l=0;l<n&&l<4;l++)subshells.push([n,l]);
  subshells.sort((a,b)=>(a[0]+a[1])-(b[0]+b[1])||a[0]-b[0]);
  const shells=[];let left=z;for(const [n,l] of subshells){if(!left)break;const take=Math.min(left,2*(2*l+1));shells[n-1]=(shells[n-1]||0)+take;left-=take}
  return Array.from(shells,x=>x||0);
}
function position(z){
  if(z>=57&&z<=71)return{col:z-54,row:9};
  if(z>=89&&z<=103)return{col:z-86,row:10};
  if(z===1)return{col:1,row:1};if(z===2)return{col:18,row:1};
  const starts=[[3,2],[11,3],[19,4],[37,5],[55,6],[87,7]];
  const [start,row]=starts.filter(([s])=>z>=s).pop(),i=z-start;
  if(row<=3)return{col:i<2?i+1:i+11,row};
  if(row<=5)return{col:i+1,row};
  return{col:i<2?i+1:i-13,row};
}

export const ELEMENTS=ROWS.map(([number,symbol,name,mass,family,state,discovered,look,fact,uses])=>({
  number,symbol,name,mass,family,state,discovered,look,fact,uses,
  massValue:parseFloat(mass.replace(/[[\]]/g,'')),
  shells:shellsFor(number),
  radioactive:number===43||number===61||number>=84,
  synthetic:number===43||number===61||number>=93,
  neverSeen:number===85||number===87||number>=100,
  ...position(number)
}));
