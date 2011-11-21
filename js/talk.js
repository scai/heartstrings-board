$(document).ready(function(){
    $('.hide-on-start').hide();
    
	loadTimeline(0);
	
    updateAvatarPreview(Math.floor(Math.random() * 63 + 1));
	
	// check for forum user name
	if(localStorage && localStorage['forum_user']) {
	    onForumLoginSuccess(localStorage['forum_user']);
	}

	loadSinaWeibo();
});

var currentAvatarID = 1;
var DOMAIN = 'http://samueltai.com/';
var SERVICE_ROOT = DOMAIN + 'hs/services/';
var WEIBO_ROOT = DOMAIN + 'hs/weibo/';

function getUsername() {
	if(localStorage && localStorage['forum_user']) {
	    return localStorage['forum_user'];
	}
	
	var sinaUserInfo = $('#weibo-screen-name').data('userinfo');
	if(sinaUserInfo && sinaUserInfo.screen_name) {
	    return sinaUserInfo.screen_name + ' (新浪微博)';
	}
	
	return '遊客';	
}

function loadSinaWeibo() {
    $.getJSON(WEIBO_ROOT + 'userinfo.php', function(userinfo) {
		if (userinfo.screen_name) {
		    $('<span>').attr('id', 'weibo-screen-name')
			           .text('歡迎: ' + userinfo.screen_name)
					   .data('userinfo', userinfo)
			           .appendTo('#weibo-connect');
		} else {
		    $.get(WEIBO_ROOT + 'authlink.php', {'goto':document.URL}, function(text) {
			$('<a id="weibo-auth">').attr('href', text)
					.text('登入新浪微博')
					.appendTo('#weibo-connect');
			});
		}
	});
}

function createMessageView(item) {
    var itemView = $('<div>');
    var time = item.post_date * 1000;
    $('<div>').addClass('username')
              .text(item.username)
              .appendTo(itemView);
    $('<div>').addClass('date')
              .text(TIME_AGO.ago(time))
              .attr('title', new Date(time).toLocaleString())
              .appendTo(itemView);

    var content = $('<div>').addClass('content')
                            .appendTo(itemView);
    var nonEmptyParagraphs = $.grep(
        item.content.split(/\n|\r/), 
        function(element, index) {
            return $.trim(element).length > 0;
        });
    $.each(nonEmptyParagraphs, function(i, p) {
        $('<p>').text(p).appendTo(content);
    });
    return itemView;
};

function rand() {
    return '&rand=' + new Date().getTime();
}

function createTopicMessageView(item) {
    var itemView = $('<div>').addClass('message ease-in')
                             .data('msg_id', item.msg_id);

    // topic
    createMessageView(item).addClass('topic').appendTo(itemView);

    // add avatar
    $('<div>').addClass('sprites user-avatar avatar' + item.icon_id)
              .appendTo(itemView);
              
    // place holder for replies
    $('<ul>').addClass('replies ease-in').appendTo(itemView);

    // input for new reply
    var compose =  $('<div>').addClass('compose-reply ease-in');
    $('<textarea>').addClass('reply-text').appendTo(compose);
    $('<button>').text('發表回覆').click(onPostReply).appendTo(compose);
    $('<button>').text('撤銷').click(onCancelReply).appendTo(compose);     
    compose.appendTo(itemView);  

    // operations
    $('<span title="發表回覆">')
        .addClass('show-compose-reply ease-in')
        .text('回覆')
        .click(function() {
                   $(this).closest('.message')
				          .children('.compose-reply')
						  .addClass('show');
               })
        .appendTo(itemView);     

    // add to the list
    return $('<li>').append(itemView);
}

var currentPage = 0;
function loadTimeline(page) {
    currentPage = page;
    $.getJSON(SERVICE_ROOT + 'timeline.php?page=' + page + '&size=15' + rand(), function(data) {
        var list = $('<ul>');
        var topics = new Array();

        // find all the topics
        $.each(data, function(index, item) {
            if (item.replyto == 0) {
                var topicView = createTopicMessageView(item).appendTo(list);
                topics[item.msg_id] = topicView.find('.replies').first();
            }
        });

        // find all the replies
        $.each(data, function(index, item) {
            if (item.replyto > 0) {
                var replies = topics[item.replyto];
                if (replies) {
                    $('<li>').append(createMessageView(item))
                             .appendTo(replies);
                }
            }
        });

        $('#messages').empty()
		              .append(list);
		
		// update pagination
		var p = page + 1;
		$('#page-number').text('第' + p + '頁');
    });
}

/**
 * 顯示下一頁更早以前的留言。
 */
function onNextPage() {
	loadTimeline(currentPage + 1);
}

/**
 * 顯示上一頁比較新的留言。
 */
function onPrevPage() {
    if(currentPage > 0) {
	    loadTimeline(currentPage - 1);
	}
}

function onPost() {	
    var msg = $.trim($('#compose-content').val());
    if(msg.length <= 0) {
        alert('請不要發送空消息。');
        return false;
    }

    if (msg.length > 500) {
        alert('留言最多只能有500字，您輸入了' + msg.length + '字。請修改後重試。');
        return false;
    }

    var messageData = { 
        replyto: 0, 
        username: getUsername(),
        url: '', 
        content: msg, 
        icon_id: currentAvatarID 
    };
    
    var onPostSuccess = function(data, textStatus) {
        $('#compose').removeClass('show').find('textarea').val('');
        messageData['post_date'] = new Date().getTime();
        messageData['msg_id'] = parseInt(data);
        createTopicMessageView(messageData).prependTo('#messages > ul');
    };
    
    $.post(SERVICE_ROOT + 'create.php', 
           messageData,
           onPostSuccess);
}

function onPostReply(event) {
    var messageView = $(event.target).closest('.message');
    var replyText = messageView.find('textarea').first();    
    var msg = $.trim(replyText.val());
    if(msg.length <= 0) {
        alert('請不要發送空消息。');
        return false;
    }
    var topicID = parseInt($(event.target).closest('.message').data('msg_id'));
    var replyData = { 
        replyto: topicID, 
        username: getUsername(),
        url: '', 
        content: msg, 
        icon_id: 0
    };
    
    var onReplySuccess = function(data, textStatus) {
        onCancelReply(event);
        replyData['post_date'] = new Date().getTime();
        var replyView = $('<li>').append(createMessageView(replyData));
        messageView.find('.replies').first().append(replyView);
    };
    
    $.post(SERVICE_ROOT + 'create.php', 
           replyData,
           onReplySuccess);
}

function onCancelReply(event) {    
    $(event.target).closest('.compose-reply')
	               .removeClass('show')
				   .children('textarea')
				   .val('');
}

function onToggleCompose() {
    $('#user.show').removeClass('show');
    $('#compose').toggleClass('show');
}

function onToggleLogin() {
    $('#compose.show').removeClass('show');
    $('#user').toggleClass('show');
}

function onRefreshTimeline() {
    loadTimeline(0);
}

function onPreviousAvatar() {
    if (currentAvatarID > 1) {
        updateAvatarPreview(--currentAvatarID);
    }
}

function onNextAvatar() {
    if (currentAvatarID < 63) {
        updateAvatarPreview(++currentAvatarID);
    }
}


function updateAvatarPreview(avatarID) {
    currentAvatarID = avatarID;
    $('#avatar-selector-preview').attr('class', 'sprites avatar' + avatarID);
    $('#avatar-id').text('#' + avatarID);
}

function onForumLogin() {
    var user = $('#forum-username').val();
	var pass = $('#forum-password').val();
	$('#forum-connect .error-message').empty().slideUp();
	
	
    $.get(DOMAIN + 'hs/apps/talk/auth.php', {username:user, password:pass}, function(result) {
	    var elements = result.split('\n');
		var error = null;
		if (elements[0] > 0) {
			onForumLoginSuccess(user);
            return;					   
		} else if (elements[0] == -1) {
		    error = '用戶名不存在';
		} else if (elements[0] == -2) {
		    error = '密碼錯誤';
		} else {
		    error = '登錄失敗';
		}
		
		$('#forum-password').val('');
		$('#forum-connect .error-message').text(error).slideDown();
	});
}

function onForumLoginSuccess(username) {
    if(username && username.length > 0) {
		$('#forum-username').val('');
		$('#forum-connect').hide();
		$('<div>').text(username + '，歡迎回來！')
		          .attr('id', 'forum-welcome')
				  .appendTo('#forum-connect-success');
		$('<a>').attr('href', '#logout')
		        .text('登出')
           		.attr('id', 'forum-logout')
				.click(onForumLogout)
				.appendTo('#forum-connect-success');
	}
	
	if (localStorage) {
	    localStorage['forum_user'] = username;
	}
}

function onForumLogout() {
    $('#forum-connect-success').empty();
	$('#forum-connect').show();
	if (localStorage) {
	    localStorage.removeItem('forum_user');
	}
}

function onClosePopup() {
    $('.class-pane').detach();
}


/* Start TimeAgo Class */

function TimeAgo() {
    this.NOW = new Date().getTime();
    this.SECOND = 1000;
    this.MINUTE = this.SECOND * 60;
    this.HOUR = this.MINUTE * 60;
    this.DAY = this.HOUR * 24;
    this.WEEK = this.DAY * 7;
    this.MONTH = this.DAY * 30;
    this.YEAR = this.DAY * 365;
}

TimeAgo.prototype.ago = function(time) {
    var dist = this.NOW - time;
    if (dist <= this.SECOND) {
        return "現在";
    } else if (dist < this.MINUTE) {
        return parseInt(dist / this.SECOND) + ' 秒前';
    } else if (dist < this.HOUR) {
        return parseInt(dist / this.MINUTE) + ' 分鐘前';
    } else if (dist < this.DAY) {
        return parseInt(dist / this.HOUR) + ' 小時前';
    } else if (dist < this.WEEK) {
        return parseInt(dist / this.DAY) + ' 天前';
    } else if (dist < this.MONTH) {
        return parseInt(dist / this.WEEK) + ' 週前';
    } else if (dist < this.YEAR) {
        return parseInt(dist / this.MONTH) + ' 個月前';
    } else {
        return parseInt(dist / this.YEAR) + ' 年前';
    }    
}

var TIME_AGO = new TimeAgo();

/* End of TimeAgo Class */