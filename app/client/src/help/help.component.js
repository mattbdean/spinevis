const angular = require('angular');

require('./help-dialog.scss');

const ctrlDef = ['$mdDialog', function($mdDialog) {
    /**
     * Uses Angular Material's $mdDialog service to open a modal dialog that
     * displays the contents of the 'help-dialog' partial template.
     */
    this.open = (event) => {
        $mdDialog.show({
            template: require('./help-dialog.template.pug'),
            parent: angular.element(document.body),
            targetEvent: event,
            clickOutsideToClose: true
        })
    };
}];

module.exports = {
    template: require('./help.template.pug'),
    controller: ctrlDef
};
