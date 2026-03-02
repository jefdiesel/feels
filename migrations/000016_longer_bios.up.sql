-- Update seed profiles with longer bios and better prompts

DO $$
DECLARE
    -- Longer bio templates (5x longer)
    long_bios TEXT[] := ARRAY[
        'Coffee addict with a serious addiction to trying every new cafe that opens in the city. I spend my weekends exploring hidden gems, from tiny espresso bars in the Village to trendy roasteries in Williamsburg. Looking for someone to explore the city with, whether that means getting lost in a new neighborhood, finding the best slice of pizza at 2am, or just sitting in the park watching the world go by. I believe the best relationships start with a really good conversation over really good coffee.',
        'Musician by night, designer by day. I work at a startup downtown but my real passion is playing guitar in a jazz band every Thursday at a little bar in the East Village. Love trying new restaurants - my friends joke that I should have been a food critic instead. I''ve eaten at basically every ramen spot in Manhattan and I have very strong opinions about which ones are worth the wait. When I''m not working or playing music, you''ll find me at a gallery opening or hunting for vintage records.',
        'Photographer and traveler who''s been to 30 countries and counting. Always planning the next adventure, whether it''s a weekend road trip upstate or a month-long backpacking trip through Southeast Asia. I document everything - my apartment is basically a gallery of prints from my travels. I''m looking for someone who gets excited about booking a spontaneous flight, who doesn''t mind eating street food for dinner, and who appreciates a really good sunset. Let''s make some memories worth photographing.',
        'Tech nerd with a passion for cooking that I take way too seriously. I''ve taught myself to make everything from fresh pasta to proper French pastries. My dinner parties are legendary among my friends - I once spent three days preparing a seven-course tasting menu for twelve people. I work in AI but I''m not one of those tech bros, I promise. I read actual books, I go outside, and I can hold a conversation about things other than work. Make me laugh and I''ll cook you the best meal of your life.',
        'Yoga instructor and bookworm seeking deep conversations and someone who understands the importance of balance. I teach vinyasa at a studio in Chelsea but I also run a book club that meets every month at a wine bar in the West Village. Currently reading way too many books at once, as always. I believe in starting the day with meditation and ending it with a good glass of wine. Looking for someone who values personal growth, isn''t afraid of vulnerability, and knows that the best things in life take time to cultivate.',
        'Artist based in NYC, working out of a studio in Bushwick that I share with three other painters. My work is abstract expressionist - lots of color, lots of emotion, lots of coffee stains on my clothes. Will definitely show you my studio on the second date if the first one goes well. I''m looking for someone who appreciates creativity, doesn''t mind paint under my fingernails, and understands that sometimes I need to disappear into my work for a few days. But when I''m present, I''m really present.',
        'Finance by day, DJ by night - yes, I contain multitudes. I spend my weekdays analyzing spreadsheets and my weekends spinning records at warehouse parties in Brooklyn. Rooftop season is my favorite season because it combines my two loves: good music and good views. I''ve been collecting vinyl since college and my apartment looks like a record store exploded in it. Looking for someone who can hang at a sweaty dance party until 4am but also enjoys a quiet Sunday morning with the paper.',
        'Startup founder trying to change the world, one line of code at a time. Work hard, play harder - that''s not just a cliche for me, it''s a lifestyle. I founded my company three years ago and we just closed our Series B, so things are finally starting to calm down a little. I''m looking for someone who understands ambition but also knows how to unplug. My ideal weekend involves working out, brunch with friends, and then absolutely nothing productive for the rest of the day.',
        'Teacher who believes that education is the most important thing we can invest in. I teach high school English in the Bronx and it''s the most challenging and rewarding thing I''ve ever done. On weekends, I decompress by hiking in the Hudson Valley or trying new coffee shops around the city. I have very strong opinions about books - Jane Austen is overrated, fight me - and I''m always looking for good recommendations. If you can make me see a classic in a new way, I''m already intrigued.',
        'Writer working on my first novel while pretending to work on freelance assignments. You''ll probably find me at a cafe, laptop open, pretending I''m being productive while actually people-watching and eavesdropping on conversations for material. I''ve been working on this book for two years and I''m finally in the home stretch. I need someone who understands creative types, who doesn''t mind when I zone out mid-conversation because I just thought of the perfect sentence, and who will celebrate with me when this thing finally gets published.',
        'Nurse with a love for travel and adventure. I work night shifts at a hospital in the city, which means my schedule is weird but also means I have weekdays free for exploring. I''ve been to six continents and my goal is to hit all seven before I turn 35. When I''m not working or traveling, I''m training for my next marathon or trying a new hiking trail. Looking for someone who can keep up with my energy and doesn''t mind planning trips six months in advance.',
        'Chef who can cook you a dinner you''ll never forget. I trained at the Culinary Institute and worked my way up from line cook to sous chef at a Michelin-starred restaurant in Manhattan. Now I''m planning to open my own place in the next couple years. I take food very seriously but I don''t take myself too seriously. Wine is definitely included in any dinner I make - I have strong opinions about natural wines and I''m not afraid to share them. Let me cook for you and see where things go.',
        'Lawyer who''s actually fun at parties - I know, we''re rare. I work in entertainment law, which means my job is basically helping creative people protect their work. It''s way more interesting than it sounds. Outside of work, I''m the friend who always knows about the new restaurant or bar before anyone else. I read the New Yorker cover to cover, I have strong opinions about the best martini in the city, and I can talk about almost anything for hours. Looking for someone equally curious.',
        'Physical therapist helping people recover from injuries and get back to doing what they love. There''s nothing more rewarding than watching someone who couldn''t walk six months ago run their first 5K. I''ll fix your posture - seriously, you''re probably slouching right now - and maybe steal your heart in the process. I practice what I preach: I work out six days a week, I eat clean most of the time, and I get eight hours of sleep. But I also believe in balance, so yes, I''ll eat pizza with you.',
        'Marketing exec who knows all the best brunch spots in every neighborhood. It''s basically my job to know what''s cool before it''s cool, and I take that responsibility very seriously. I''ve worked at agencies, startups, and big tech companies, and I''ve learned something from each one. Currently leading brand at a company you''ve definitely heard of. Looking for someone who appreciates good design, understands the value of a strong personal brand, and doesn''t mind me taking photos of our food for Instagram.',
        'Architect designing buildings by day and designing my perfect match in my head by night. Could be you - I''ll know it when I see it. I''ve worked on projects all over the city, from residential high-rises to museum renovations. I think about space and light and how they make people feel. I''m looking for someone who notices the details, who can appreciate a perfectly proportioned room, and who understands that design is everywhere, from the chair you''re sitting in to the app you''re swiping on right now.'
    ];

    -- Better prompt answers (longer and more personal)
    better_prompt_answers TEXT[] := ARRAY[
        'good food and even better conversation - I want to hear your hot takes and your unpopular opinions. Tell me about the book that changed your life or the trip that didn''t go as planned.',
        'that I''ll never find someone who truly gets my weird sense of humor. I make a lot of obscure references and I need someone who either gets them or is willing to pretend they do.',
        'doesn''t take themselves too seriously but takes the things that matter very seriously. Someone who can laugh at themselves but also show up when it counts.',
        'octopuses have three hearts and blue blood. Also, honey never spoils - they''ve found 3000-year-old honey in Egyptian tombs that''s still perfectly edible. I collect random facts like this.',
        'coffee in bed on a lazy Sunday, long walks through the city when the weather is perfect, a really good playlist, and that moment when you finish a book and just sit there thinking about it.',
        'people who get really passionate about random things. Tell me about your niche hobby, your controversial food opinion, your weird collection. I want to see what lights you up.',
        'what''s your go-to karaoke song? Mine is "Don''t Stop Believin''" and I''m not ashamed. I will absolutely do the air guitar solo.',
        'quality time and acts of service. I show love by remembering the little things you mentioned and then surprising you with them later. I want someone who notices the effort.',
        'you can handle my chaotic energy on weekends but also respect my need for quiet recharge time. I''m an extroverted introvert, if that makes any sense.',
        'sing loudly in the car even when you don''t know the words. Also, if I send you voice memos. Also, if I get really into true crime podcasts and have theories.',
        'making me laugh until my cheeks hurt and I can''t breathe. Bonus points if it''s at an inappropriate time, like in a quiet museum or during a serious movie scene.',
        'trying new restaurants and giving them very detailed reviews to my friends. I have a whole rating system. Yes, I''m that person. No, I don''t feel bad about it.'
    ];
BEGIN
    -- Update first 16 profiles with longer bios
    FOR i IN 1..16 LOOP
        UPDATE profiles
        SET bio = long_bios[i]
        WHERE user_id = (
            SELECT user_id FROM profiles ORDER BY user_id LIMIT 1 OFFSET i-1
        );
    END LOOP;

    -- Update prompts for first 50 profiles with better answers
    FOR i IN 1..50 LOOP
        UPDATE profiles
        SET prompts = jsonb_build_array(
            jsonb_build_object('id', 'prompt_' || i || '_1', 'question', 'The way to win me over is', 'answer', better_prompt_answers[1 + ((i-1) % array_length(better_prompt_answers, 1))]),
            jsonb_build_object('id', 'prompt_' || i || '_2', 'question', 'My simple pleasures', 'answer', better_prompt_answers[1 + (i % array_length(better_prompt_answers, 1))]),
            jsonb_build_object('id', 'prompt_' || i || '_3', 'question', 'I get way too excited about', 'answer', better_prompt_answers[1 + ((i+1) % array_length(better_prompt_answers, 1))])
        )
        WHERE user_id = (
            SELECT user_id FROM profiles ORDER BY user_id LIMIT 1 OFFSET i-1
        );
    END LOOP;
END $$;
