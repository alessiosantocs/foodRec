var input = document.getElementById("json_input");
var button = document.getElementById("proceed");
var output = document.getElementById("output")

var screen_log_last_time;
var screenLog = function(message){
  var time = (new Date());
  var message_time = time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();

  if(screen_log_last_time !== message_time)
    output.innerHTML += message_time + " => \n";
  output.innerHTML += message;

  if(screen_log_last_time !== message_time)
    output.innerHTML += "\n\n";
  else
    output.innerHTML += "\n";

  screen_log_last_time = message_time;
};

var Calculator = function(){

  var self = this;

  /*
    ### Assuptions
    1. The machine needs to know how to cook and prepare meals to recognise food.

    ### Let's assume our system knows how all meals are usually prepared.
      E.g.  Salads always contain vegetables;
            they could should also contain proteins ("fish", "meat", "cheese", "legume");
            they could also contain fruit and nuts
  */
  var known_categories = [
    {
      name: "salad",
      priority_ids: ["legume", "fruit", "sauce"],
      contains_at_least_ids: ["vegetable"],
      should_contain_at_least_one_of_ids: ["fish", "meat", "legume", "cheese"], // proteins basically
      could_contain_ids: ["fruit", "nuts"],
      intuition_tags: ["vegetable", "bowl", "salad", "lettuce", "fresh", "healthy", "meal"]
    }
  ];


  /*-carbs: -1 => it depends by the type of the thing, make an average of the elements*/
  var known_ingredients = [
    {name: "vegetable", carbs: -1, children: [
      {name: "lettuce", carbs: 3-1},
      {name: "carrot", carbs: 41}
    ]},
    {name: "fish", carbs: 0},
    {name: "meat", carbs: 0, children: [
      {name: "chicken", carbs: 0}
    ]},
    {name: "legume", carbs: -1, children: [
      {name: "white bean", carbs: 45-11}
    ]},
    {name: "cheese", carbs: -1, children: [
      {name: "parmesan", carbs: 430}
    ]},
    {name: "fruit", carbs: 80}
  ];

  // Shoot an intuition of what the plate is based on the tags
  var _searchCategoryForTagsMatch = function(tags){
    // For each category
    for(var i=0; i < known_categories.length; i++){
      // match every tag with the category's intuition tags
      // calculate the match probability
    }
  };

  var recognizeCategories = function(tags){
    var categories_array = [];
    for(var i = 0; i < known_categories.length; i++){
      var category = known_categories[i];
      var should_add_category = false;
      var category_intuition_tags_found_count = 0;
      for(var j=0; j < tags.length; j++){
        var tag = tags[j];

        if(category.name == tag){
          should_add_category = true;
        }
        // let's see if I can guess the category through intuition tags
        else{
          // take every tag you can get and
          if(category.intuition_tags.indexOf(tag) >= 0){
            category_intuition_tags_found_count++;
          }
        }
      }

      if(category_intuition_tags_found_count >= 3)
        should_add_category = true;

      if(should_add_category){
        categories_array.push(category);
      }
    }

    return categories_array;
  };

  var _getItem = function(type, id){
    var item = null;
    if(type == "ingredient"){
      for(var i = 0; i < known_ingredients.length; i++){
        var ingredient = known_ingredients[i];

        if(id == ingredient.name){
          item = ingredient;
        }

        if(ingredient.children !== undefined){
          var children = ingredient.children;
          var parent_ingredient = ingredient;
          for(var j = 0; j < children.length; j++){
            var ingredient = JSON.parse(JSON.stringify(children[j]));
            ingredient.parent_ingredient = parent_ingredient;
            if(id == ingredient.name)
              item = ingredient;
          }
        }
      }
    }

    return item;
  };

  var getRequiredIngredients = function(categories, ingredients){
    var response = {must_contain: [], should_contain_one_of: []};
    for(var i = 0; i < categories.length; i++){
      var category = categories[i];

      // Must contain part
      var contains_at_least_ids = category.contains_at_least_ids;
      for(var j = 0; j < contains_at_least_ids.length; j++){
        var at_least_item = _getItem("ingredient", contains_at_least_ids[j]);
        var should_add_ingredient = true;
        for(var z = 0; z < ingredients.length; z++){
          var ingredient = ingredients[z];

          if(ingredient.name == at_least_item.name){
            should_add_ingredient = false;
          }
        }

        if(should_add_ingredient)
          response.must_contain.push(at_least_item);
      }

      // Should contain at least part
      var should_contain_at_least_one_of_ids = category.should_contain_at_least_one_of_ids;
      // for each contained ingredient
      var should_require_all = true;

      for(var j = 0; j < ingredients.length; j++){
        var ingredient = ingredients[j];

        // check if this ingredient is in the list of required ones
        // for(var z = 0; z < should_contain_at_least_one_of_ids.length; z++){
        //   var at_least_one_item = _getItem("ingredient", should_contain_at_least_one_of_ids[z]);
        //
        //   if(ingredient.name == at_least_one_item.name){
        //     should_require_all = false;
        //   }
        // }

        // if you can find the ingredient
        if(_getItem("ingredient", ingredient.name) !== null){
          should_require_all = false;
        }
      }

      if(should_require_all){
        console.log(response.should_contain_one_of);
        response.should_contain_one_of = response.should_contain_one_of.concat(should_contain_at_least_one_of_ids)
      }

    }


    return response;
  };

  var recognizeIngredients = function(categories, tags){
    var response = {ingredients: [], missing_ingredients: {}, suggested_ingredients: []};

    // Missing ingredients part
    /*var required_ingredients = [];
    for(var i = 0; i < categories.length; i++){

    }*/


    // Fetch known ingredients
    for(var i = 0; i < tags.length; i++){
      var possible_ingredient = _getItem("ingredient", tags[i]);
      if(possible_ingredient !== null){
        response.ingredients.push(possible_ingredient);
      }
    }

    response.missing_ingredients = getRequiredIngredients(categories, response.ingredients);

    return response;
  };

  self.run = function(recognition_response){
    var response = {questions: [], carbs_count: 0};

    var recognition_tags = recognition_response.predicted_classes;

    var categories = recognizeCategories(recognition_tags);

    if(categories.length == []){
      screenLog("This is a food something I don't know yet (I only know: [" + known_categories.map(function(el){return el.name;}) + "] and that's it). I may need to study a bit");
      return false;
    }

    var ingredients = recognizeIngredients(categories, recognition_tags);

    screenLog("From a first look it should be: " + categories.map(function(el){return el.name}).join(","));
    screenLog("usually composed of: " +  categories.map(function(cat){
      return cat.contains_at_least_ids.map(function(ing){return ing + "*"}) + ", " + cat.should_contain_at_least_one_of_ids.join(" or ") + ", " + cat.could_contain_ids
    }));
    screenLog("At first look it seems to be composed of: " + ingredients.ingredients.map(function(el){return el.name;}));
    screenLog("I am probably missing or you didn't add: " + JSON.stringify(ingredients.missing_ingredients));

    return true;
  };
};

var calculator = new Calculator();
window.calculator = calculator;

button.onclick = function(event){
  var json = JSON.parse(input.value);
  json = json.files[0];

  screenLog("Uploading the image!");

  window.setTimeout(function(){
    screenLog("Analysis with image recognition algorithm!");
  }, 1000);

  window.setTimeout(function(){

    if(calculator.run(json)){
      window.setTimeout(function(){
        screenLog("Fake: repeating image recognition looking for proteins in salad!");
      }, 2000);

      window.setTimeout(function(){
        screenLog("Fake: Here we go! I've found some cheese in there (mozzarella) and fish (tuna fish)");
      }, 3000);

      window.setTimeout(function(){
        screenLog("Fake: Hey, did you add some fruit or nuts in your salad? (YES/NO)");
      }, 5000);
    }

  }, 3000);





};
