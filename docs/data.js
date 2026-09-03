/* Scripture texts are from the World English Bible, which is public domain.
   Where the WEB prints "Yahweh", most English Bibles print "the LORD".

   Fields:
     t       short title for the day
     ref     reference
     s       the passage
     g       one line to carry through the day
     spoken  true when God is speaking in the first person
     aloud   optional: a way to read the passage aloud with your own name in it,
             offered as a reading aid — never as a substitute for the text */

const DAYS = [
 {t:"It was never earned", spoken:false, ref:"Deuteronomy 7:7–8",
  s:"Yahweh didn't set his love on you nor choose you, because you were more in number than any people; for you were the fewest of all peoples; but because Yahweh loves you, and because he desires to keep the oath which he swore to your fathers.",
  g:"The reason he loves you is in him, not in you. That is why it holds."},
 {t:"What he says his name means", spoken:true, ref:"Exodus 34:6–7",
  s:"Yahweh! Yahweh, a merciful and gracious God, slow to anger, and abundant in loving kindness and truth, keeping loving kindness for thousands, forgiving iniquity and disobedience and sin.",
  g:"Asked to describe himself, this is what he led with."},
 {t:"Everlasting", spoken:true, ref:"Jeremiah 31:3",
  s:"Yes, I have loved you with an everlasting love. Therefore I have drawn you with loving kindness.",
  g:"It had no beginning. It will have no end. You arrived in the middle of it.",
  aloud:"I have loved you, {name}, with an everlasting love."},
 {t:"Called by name", spoken:true, ref:"Isaiah 43:1",
  s:"Don't be afraid, for I have redeemed you. I have called you by your name. You are mine.",
  g:"Not the crowd. Your name.",
  aloud:"Don't be afraid, {name}. I have redeemed you. I have called you by your name. You are mine."},
 {t:"Precious in his sight", spoken:true, ref:"Isaiah 43:4",
  s:"Since you have been precious and honored in my sight, and I have loved you, therefore I will give people in your place, and nations instead of your life.",
  g:"He puts a price on you out loud, and it is a scandalous one.",
  aloud:"You are precious and honored in my sight, {name}, and I have loved you."},
 {t:"He cannot forget you", spoken:true, ref:"Isaiah 49:15–16",
  s:"Can a woman forget her nursing child, that she should not have compassion on the son of her womb? Yes, these may forget, yet I will not forget you! Behold, I have engraved you on the palms of my hands.",
  g:"Where he would have to look to lose track of you, your name is already cut.",
  aloud:"I will not forget you, {name}. I have engraved you on the palms of my hands."},
 {t:"Steadier than the mountains", spoken:true, ref:"Isaiah 54:10",
  s:"For the mountains may depart, and the hills be removed, but my loving kindness will not depart from you, and my covenant of peace will not be removed.",
  g:"Name the most permanent thing you know. His love outlasts it.",
  aloud:"The mountains may depart, {name}, but my loving kindness will not depart from you."},
 {t:"He carries you to the end", spoken:true, ref:"Isaiah 46:4",
  s:"Even to old age I am he, and even to gray hairs I will carry you. I have made, and I will bear. Yes, I will carry, and will deliver.",
  g:"The one who made you has agreed to carry you the whole way.",
  aloud:"Even to gray hairs I will carry you, {name}. I have made, and I will bear."},
 {t:"He sings", spoken:false, ref:"Zephaniah 3:17",
  s:"Yahweh, your God, is among you, a mighty one who will save. He will rejoice over you with joy. He will calm you in his love. He will rejoice over you with singing.",
  g:"He is not merely willing to have you. He is glad about you."},
 {t:"New every morning", spoken:false, ref:"Lamentations 3:22–23",
  s:"It is because of Yahweh's loving kindnesses that we are not consumed, because his compassion doesn't fail. They are new every morning. Great is your faithfulness.",
  g:"Yesterday spent nothing. There is a fresh supply waiting when you wake."},
 {t:"Drawn with kindness", spoken:true, ref:"Hosea 11:4",
  s:"I drew them with cords of a man, with ties of love; and I was to them like those who lift up the yoke on their necks; and I bent down to him and I fed him.",
  g:"He stoops. That is the posture he takes toward you."},
 {t:"He delights in mercy", spoken:false, ref:"Micah 7:18",
  s:"Who is a God like you, who pardons iniquity, and passes over the disobedience of the remnant of his heritage? He doesn't retain his anger forever, because he delights in loving kindness.",
  g:"Mercy is not something he does reluctantly. It is what he enjoys."},
 {t:"As high as the heavens", spoken:false, ref:"Psalm 103:8, 11–12",
  s:"Yahweh is merciful and gracious, slow to anger, and abundant in loving kindness. … For as the heavens are high above the earth, so great is his loving kindness toward those who fear him. As far as the east is from the west, so far has he removed our transgressions from us.",
  g:"Two immeasurable distances: the size of his love, and the distance he has put between you and your sin."},
 {t:"Like a father", spoken:false, ref:"Psalm 103:13–14",
  s:"Like a father has compassion on his children, so Yahweh has compassion on those who fear him. For he knows how we are made. He remembers that we are dust.",
  g:"He is not disappointed to discover you are weak. He knew. He made you."},
 {t:"Wide enough to hide in", spoken:false, ref:"Psalm 36:5, 7",
  s:"Your loving kindness, Yahweh, is in the heavens. Your faithfulness reaches to the skies. … How precious is your loving kindness, God! The children of men take refuge under the shadow of your wings.",
  g:"It is not only vast. It is a place you are allowed to go."},
 {t:"Better than life", spoken:false, ref:"Psalm 63:3",
  s:"Because your loving kindness is better than life, my lips shall praise you.",
  g:"Everything you are afraid of losing is worth less than what you already have."},
 {t:"It surrounds", spoken:false, ref:"Psalm 32:10",
  s:"Many sorrows come to the wicked, but loving kindness shall surround him who trusts in Yahweh.",
  g:"Not a reward at the end. A perimeter, now, on every side."},
 {t:"He goes on being good", spoken:false, ref:"Psalm 100:5",
  s:"For Yahweh is good. His loving kindness endures forever; his faithfulness to all generations.",
  g:"Long after you, still true. Long before you, already true."},
 {t:"I have loved you", spoken:true, ref:"Malachi 1:2",
  s:"I have loved you.",
  g:"The shortest sentence in the collection. Say it back slowly until you hear it.",
  aloud:"I have loved you, {name}."},
 {t:"Given, not lent", spoken:false, ref:"John 3:16",
  s:"For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.",
  g:"The most familiar verse you know. Read it as if it just arrived."},
 {t:"Loved while unlovely", spoken:false, ref:"Romans 5:8",
  s:"But God commends his own love toward us, in that while we were yet sinners, Christ died for us.",
  g:"He did not wait for you to improve. He moved first, at your worst."},
 {t:"Nothing can separate", spoken:false, ref:"Romans 8:35, 38–39",
  s:"Who shall separate us from the love of Christ? Could oppression, or anguish, or persecution, or famine, or nakedness, or peril, or sword? … For I am persuaded that neither death, nor life, nor angels, nor principalities, nor things present, nor things to come, nor powers, nor height, nor depth, nor any other created thing will be able to separate us from God's love which is in Christ Jesus our Lord.",
  g:"Go through the list. Put your own fear on it. It still doesn't make the cut."},
 {t:"Loved while dead", spoken:false, ref:"Ephesians 2:4–5",
  s:"But God, being rich in mercy, for his great love with which he loved us, even when we were dead through our trespasses, made us alive together with Christ.",
  g:"You contributed nothing. The dead don't. That is the point."},
 {t:"Beyond knowing", spoken:false, ref:"Ephesians 3:18–19",
  s:"… that you may be strengthened to comprehend with all the saints what is the width and length and height and depth, and to know Christ's love which surpasses knowledge, that you may be filled with all the fullness of God.",
  g:"You will not get to the bottom of it. Spend your life not getting to the bottom of it."},
 {t:"The Father himself", spoken:true, ref:"John 16:27",
  s:"… for the Father himself loves you, because you have loved me, and have believed that I came from God.",
  g:"Not tolerated by the Father because the Son intercedes. Loved by the Father himself."},
 {t:"The same love", spoken:true, ref:"John 15:9",
  s:"Even as the Father has loved me, I also have loved you. Remain in my love.",
  g:"Measure it: the love the Father has for the Son. That is the measure.",
  aloud:"As the Father has loved me, I also have loved you, {name}. Remain in my love."},
 {t:"Loved as he is loved", spoken:true, ref:"John 17:23",
  s:"I in them, and you in me, that they may be perfected into one; that the world may know that you sent me and loved them, even as you loved me.",
  g:"He prayed this out loud, about you, the night before he died."},
 {t:"Look at it", spoken:false, ref:"1 John 3:1",
  s:"Behold, how great a love the Father has given to us, that we should be called children of God! For this cause the world doesn't know us, because it didn't know him.",
  g:"“Behold” is a command. Stop and look at it today."},
 {t:"This is what love is", spoken:false, ref:"1 John 4:10",
  s:"In this is love, not that we loved God, but that he loved us, and sent his Son as the atoning sacrifice for our sins.",
  g:"The definition doesn't start with you. It never did."},
 {t:"Known and relied on", spoken:false, ref:"1 John 4:16, 19",
  s:"We know and have believed the love which God has toward us. God is love, and he who remains in love remains in God, and God remains in him. … We love him, because he first loved us.",
  g:"Everything you will ever give back to him is an echo of something he did first."}
];

const VOICE = [
 {group:"Old Testament", items:[
  {ref:"Exodus 34:6–7", note:"God names himself", s:"Yahweh! Yahweh, a merciful and gracious God, slow to anger, and abundant in loving kindness and truth, keeping loving kindness for thousands, forgiving iniquity and disobedience and sin."},
  {ref:"Jeremiah 31:3", s:"Yes, I have loved you with an everlasting love. Therefore I have drawn you with loving kindness."},
  {ref:"Isaiah 43:1", s:"Don't be afraid, for I have redeemed you. I have called you by your name. You are mine."},
  {ref:"Isaiah 43:4", s:"Since you have been precious and honored in my sight, and I have loved you, therefore I will give people in your place, and nations instead of your life."},
  {ref:"Isaiah 49:15–16", s:"Can a woman forget her nursing child, that she should not have compassion on the son of her womb? Yes, these may forget, yet I will not forget you! Behold, I have engraved you on the palms of my hands."},
  {ref:"Isaiah 54:10", s:"For the mountains may depart, and the hills be removed, but my loving kindness will not depart from you, and my covenant of peace will not be removed."},
  {ref:"Isaiah 46:4", s:"Even to old age I am he, and even to gray hairs I will carry you. I have made, and I will bear. Yes, I will carry, and will deliver."},
  {ref:"Isaiah 41:10", s:"Don't you be afraid, for I am with you. Don't be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness."},
  {ref:"Isaiah 62:4–5", s:"You shall no more be termed “Forsaken”, nor shall your land any more be termed “Desolate”; but you shall be called “My delight is in her” … for Yahweh delights in you. … As the bridegroom rejoices over the bride, so your God will rejoice over you."},
  {ref:"Jeremiah 31:20", s:"Is Ephraim my dear son? Is he a darling child? For as often as I speak against him, I still remember him earnestly. Therefore my heart yearns for him. I will surely have mercy on him."},
  {ref:"Jeremiah 32:40–41", s:"I will make an everlasting covenant with them, that I will not turn away from following them, to do them good. … Yes, I will rejoice over them to do them good."},
  {ref:"Hosea 11:4", s:"I drew them with cords of a man, with ties of love; and I was to them like those who lift up the yoke on their necks; and I bent down to him and I fed him."},
  {ref:"Hosea 14:4", s:"I will heal their waywardness. I will love them freely; for my anger is turned away from them."},
  {ref:"Malachi 1:2", note:"the first thing the book says", s:"I have loved you."}
 ]},
 {group:"The voice from heaven", items:[
  {ref:"Matthew 3:17", note:"before the Son had done any public work", s:"This is my beloved Son, with whom I am well pleased."}
 ]},
 {group:"Jesus speaking", items:[
  {ref:"John 15:9", s:"Even as the Father has loved me, I also have loved you. Remain in my love."},
  {ref:"John 16:27", s:"… for the Father himself loves you, because you have loved me, and have believed that I came from God."},
  {ref:"John 17:23", note:"from his prayer the night before the crucifixion", s:"… that the world may know that you sent me and loved them, even as you loved me."},
  {ref:"Luke 12:32", s:"Don't be afraid, little flock, for it is your Father's good pleasure to give you the Kingdom."},
  {ref:"Revelation 3:19", s:"As many as I love, I reprove and chasten. Be zealous therefore, and repent."}
 ]}
];

const THEMES = [
 {t:"I feel forgotten", items:[
   {ref:"Isaiah 49:15–16", s:"Can a woman forget her nursing child, that she should not have compassion on the son of her womb? Yes, these may forget, yet I will not forget you! Behold, I have engraved you on the palms of my hands."},
   {ref:"Isaiah 43:1", s:"Don't be afraid, for I have redeemed you. I have called you by your name. You are mine."},
   {ref:"Luke 12:6–7", s:"Not one of them is forgotten by God. But the very hairs of your head are all counted. Therefore don't be afraid. You are of more value than many sparrows."}
  ], also:"Psalm 139:1–18 · Isaiah 40:27–31"},
 {t:"I feel guilty", items:[
   {ref:"Romans 5:8", s:"But God commends his own love toward us, in that while we were yet sinners, Christ died for us."},
   {ref:"Psalm 103:12", s:"As far as the east is from the west, so far has he removed our transgressions from us."},
   {ref:"Micah 7:18", s:"Who is a God like you, who pardons iniquity, and passes over the disobedience of the remnant of his heritage? He doesn't retain his anger forever, because he delights in loving kindness."},
   {ref:"Romans 8:1", s:"There is therefore now no condemnation to those who are in Christ Jesus."}
  ], also:"1 John 1:9 · Psalm 130:3–4 · Luke 15:20–24"},
 {t:"I'm afraid", items:[
   {ref:"Isaiah 41:10", s:"Don't you be afraid, for I am with you. Don't be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness."},
   {ref:"1 John 4:18", s:"There is no fear in love; but perfect love casts out fear."},
   {ref:"Luke 12:32", s:"Don't be afraid, little flock, for it is your Father's good pleasure to give you the Kingdom."}
  ], also:"Psalm 27:1 · Psalm 23 · Romans 8:15"},
 {t:"I've drifted", items:[
   {ref:"Hosea 14:4", s:"I will heal their waywardness. I will love them freely; for my anger is turned away from them."},
   {ref:"Luke 15:20", s:"But while he was still far off, his father saw him, and was moved with compassion, and ran, and fell on his neck, and kissed him."},
   {ref:"Jeremiah 31:3", s:"Yes, I have loved you with an everlasting love. Therefore I have drawn you with loving kindness."}
  ], also:"Isaiah 55:6–7 · Joel 2:12–13 · James 4:8"},
 {t:"I'm worn out", items:[
   {ref:"Isaiah 46:4", s:"Even to old age I am he, and even to gray hairs I will carry you. I have made, and I will bear. Yes, I will carry, and will deliver."},
   {ref:"Psalm 103:13–14", s:"Like a father has compassion on his children, so Yahweh has compassion on those who fear him. For he knows how we are made. He remembers that we are dust."},
   {ref:"Lamentations 3:22–23", s:"It is because of Yahweh's loving kindnesses that we are not consumed, because his compassion doesn't fail. They are new every morning."}
  ], also:"Matthew 11:28–30 · Isaiah 40:29–31 · Psalm 62:5–8"},
 {t:"I doubt he wants me", items:[
   {ref:"Zephaniah 3:17", s:"He will rejoice over you with joy. He will calm you in his love. He will rejoice over you with singing."},
   {ref:"Isaiah 62:4", s:"You shall no more be termed “Forsaken” … but you shall be called “My delight is in her” … for Yahweh delights in you."},
   {ref:"1 John 3:1", s:"Behold, how great a love the Father has given to us, that we should be called children of God!"}
  ], also:"Jeremiah 32:41 · Ephesians 1:4–6 · John 16:27"},
 {t:"I'm afraid of losing something", items:[
   {ref:"Psalm 63:3", s:"Because your loving kindness is better than life, my lips shall praise you."},
   {ref:"Isaiah 54:10", s:"For the mountains may depart, and the hills be removed, but my loving kindness will not depart from you, and my covenant of peace will not be removed."},
   {ref:"Romans 8:38–39", s:"For I am persuaded that neither death, nor life … nor things present, nor things to come … will be able to separate us from God's love which is in Christ Jesus our Lord."}
  ], also:"Psalm 73:25–26 · 2 Corinthians 4:16–18"},
 {t:"I'm grateful", items:[
   {ref:"Psalm 136:1", s:"Give thanks to Yahweh, for he is good, for his loving kindness endures forever."},
   {ref:"Psalm 36:5", s:"Your loving kindness, Yahweh, is in the heavens. Your faithfulness reaches to the skies."},
   {ref:"Revelation 1:5–6", s:"… to him who loves us, and washed us from our sins by his blood — and he made us to be a Kingdom, priests to his God and Father — to him be the glory and the dominion forever and ever."}
  ], also:"Psalm 103:1–5 · Psalm 117 · Ephesians 1:3–8"}
];

const MEMORY = [
 {ref:"Jeremiah 31:3", s:"Yes, I have loved you with an everlasting love. Therefore I have drawn you with loving kindness."},
 {ref:"Isaiah 43:1", s:"Don't be afraid, for I have redeemed you. I have called you by your name. You are mine."},
 {ref:"Isaiah 54:10", s:"For the mountains may depart, and the hills be removed, but my loving kindness will not depart from you."},
 {ref:"Zephaniah 3:17", s:"Yahweh, your God, is among you, a mighty one who will save. He will rejoice over you with joy. He will calm you in his love. He will rejoice over you with singing."},
 {ref:"Lamentations 3:22–23", s:"It is because of Yahweh's loving kindnesses that we are not consumed, because his compassion doesn't fail. They are new every morning."},
 {ref:"Psalm 103:11–12", s:"For as the heavens are high above the earth, so great is his loving kindness toward those who fear him. As far as the east is from the west, so far has he removed our transgressions from us."},
 {ref:"Romans 5:8", s:"But God commends his own love toward us, in that while we were yet sinners, Christ died for us."},
 {ref:"Romans 8:38–39", s:"For I am persuaded that neither death, nor life … nor things present, nor things to come … nor any other created thing will be able to separate us from God's love which is in Christ Jesus our Lord."},
 {ref:"Ephesians 2:4–5", s:"But God, being rich in mercy, for his great love with which he loved us, even when we were dead through our trespasses, made us alive together with Christ."},
 {ref:"John 15:9", s:"Even as the Father has loved me, I also have loved you. Remain in my love."},
 {ref:"1 John 3:1", s:"Behold, how great a love the Father has given to us, that we should be called children of God!"},
 {ref:"1 John 4:19", s:"We love him, because he first loved us."}
];

const MEMORY_METHOD = [
 ["Read it aloud five times", "looking at the words. Don’t try to remember yet — just hear the shape of it."],
 ["Cover the second half.", "Say the first half from memory, then uncover and check. Then cover the whole thing."],
 ["Say it at three separate points in the day.", "Spacing matters far more than repetition count: three times across a day beats thirty times in ten minutes."],
 ["Say it again tomorrow, and again three days later.", "That second recall, after you have half-forgotten it, is what moves it into long-term memory."],
 ["Keep the reference attached.", "Say the address before and after the verse every time, or you will know the words and lose where they live."]
];
